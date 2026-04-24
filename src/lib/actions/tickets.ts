"use server";

import { BetType, Role, TicketStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import {
  calculateTicketTotals,
  normalizeNumber,
  type TicketLineInput,
  validateLine,
} from "@/lib/bet-utils";
import { requireSession } from "@/lib/auth";
import { buildAgentCustomerWhere } from "@/lib/customer-scope";
import { isDrawAcceptingTickets } from "@/lib/draw-window";
import { getUserCompatSettings } from "@/lib/php-compat-store";
import { compatSettingsFromPayoutProfiles } from "@/lib/php-compat-shared";
import { getPayoutProfiles } from "@/lib/payouts";
import { prisma } from "@/lib/prisma";
import { normalizeTicketDisplayType } from "@/lib/ticket-line";
import { buildTicketEntryNote, parseTicketEntryNote } from "@/lib/ticket-entry-source";
import { buildAgentRecordedTicketWhere } from "@/lib/ticket-scope";
import { buildCode, getString } from "@/lib/utils";
import { buildPricingMaps, getLinePricing } from "@/lib/ticket-pricing";

export type TicketActionState = {
  error?: string;
  ok?: boolean;
  message?: string;
  redirectTo?: string;
};

const customerAllowedDisplayTypes = new Set<string>([
  "RUN_TOP",
  "RUN_BOTTOM",
  "TWO_TOP",
  "TWO_BOTTOM",
  "TWO_TOD",
  "THREE_STRAIGHT",
  "THREE_TOD",
] as const);

function serializePayoutProfiles(
  profiles: Array<{ role: Role; betType: BetType; payout: unknown; commission: unknown }>,
) {
  return profiles.map((item) => ({
    role: item.role,
    betType: item.betType,
    payout: Number(item.payout),
    commission: Number(item.commission),
  }));
}

async function parseAndValidateLines(linesJson: string) {
  let rawLines: TicketLineInput[] = [];

  try {
    rawLines = JSON.parse(linesJson) as TicketLineInput[];
  } catch {
    return { error: "ข้อมูลรายการโพยไม่ถูกต้อง" } as const;
  }

  if (!Array.isArray(rawLines) || rawLines.length === 0) {
    return { error: "กรุณาเพิ่มรายการโพยอย่างน้อย 1 รายการ" } as const;
  }

  const lines = rawLines.map((line) => ({
    betType: line.betType,
    displayType: normalizeTicketDisplayType(line.betType, line.displayType),
    number: normalizeNumber(line.number, line.betType),
    amount: Number(line.amount),
  }));

  const blockedNumbers = await import("@/lib/php-compat-store").then((mod) => mod.getBlockedNumbers());

  for (const line of lines) {
    const lineError = validateLine(line);
    if (lineError) {
      return { error: lineError } as const;
    }

    if (
      (line.betType === "TWO_TOP" && blockedNumbers.twoTop.includes(line.number)) ||
      (line.betType === "TWO_BOTTOM" && blockedNumbers.twoBottom.includes(line.number)) ||
      (line.betType === "THREE_STRAIGHT" && blockedNumbers.threeTop.includes(line.number)) ||
      (line.betType === "THREE_BOTTOM" && blockedNumbers.threeBottom.includes(line.number))
    ) {
      return { error: `เลข ${line.number} ถูกปิดรับในระบบแล้ว` } as const;
    }
  }

  return { lines } as const;
}

async function resolveTicketActorContext(session: Awaited<ReturnType<typeof requireSession>>, selectedCustomerId: string) {
  let customerId = selectedCustomerId;
  let agentId = session.userId;
  let commissionRole: Role = Role.CUSTOMER;

  if (session.role === Role.CUSTOMER) {
    const customer = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        role: true,
        ownerAgentId: true,
        Ticket_Ticket_customerIdToUser: {
          select: {
            agentId: true,
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 1,
        },
        ParentMember: {
          select: {
            ownerAgentId: true,
            Ticket_Ticket_customerIdToUser: {
              select: {
                agentId: true,
              },
              orderBy: {
                createdAt: "desc",
              },
              take: 1,
            },
          },
        },
      },
    });

    const resolvedAgentId =
      customer?.ownerAgentId ??
      customer?.ParentMember?.ownerAgentId ??
      customer?.Ticket_Ticket_customerIdToUser[0]?.agentId ??
      customer?.ParentMember?.Ticket_Ticket_customerIdToUser[0]?.agentId ??
      session.ownerAgentId ??
      null;

    if (!customer || !resolvedAgentId) {
      return { error: "ไม่พบหัวหน้าสายของสมาชิกนี้" } as const;
    }

    customerId = session.userId;
    agentId = resolvedAgentId;
    commissionRole = customer.role;
  }

  if (session.role === Role.AGENT) {
    if (!customerId) {
      return { error: "กรุณาเลือกลูกค้าที่ต้องการคีย์โพย" } as const;
    }

    const customer = await prisma.user.findFirst({
      where: {
        id: customerId,
        ...buildAgentCustomerWhere(session.userId),
      },
    });

    if (!customer) {
      return { error: "ไม่พบลูกค้าที่อยู่ในความดูแลของคุณ" } as const;
    }

    commissionRole = customer.role;
  }

  if (session.role === Role.ADMIN) {
    if (!customerId) {
      return { error: "กรุณาเลือกลูกค้าที่ต้องการคีย์โพย" } as const;
    }

    const customer = await prisma.user.findFirst({
      where: {
        id: customerId,
        role: Role.CUSTOMER,
      },
      select: {
        id: true,
        role: true,
        ownerAgentId: true,
        isSharedMember: true,
        ParentMember: {
          select: {
            ownerAgentId: true,
          },
        },
      },
    });

    if (!customer) {
      return { error: "ไม่พบลูกค้าที่เลือก" } as const;
    }

    if (!customer.ownerAgentId && !customer.isSharedMember && customer.ParentMember?.ownerAgentId === "__UNASSIGNED__") {
      return { error: "ลูกค้ารายนี้ยังไม่ได้ผูกหัวหน้าสาย" } as const;
    }

    agentId = customer.ownerAgentId ?? customer.ParentMember?.ownerAgentId ?? session.userId;
    commissionRole = customer.role;
  }

  return {
    customerId,
    agentId,
    commissionRole,
  } as const;
}

async function resolvePricingContext(customerId: string, role: Role) {
  const payoutProfiles = serializePayoutProfiles(await getPayoutProfiles(role));
  const customerCompatSettings = await getUserCompatSettings(
    customerId,
    compatSettingsFromPayoutProfiles(payoutProfiles),
  );

  return {
    payoutProfiles,
    customerCompatSettings,
  };
}

function validateCustomerTicketSubmission(entryMode: string, lines: TicketLineInput[]) {
  if (entryMode !== "NUMBER") {
    return "สมาชิกทั่วไปคีย์โพยได้เฉพาะโหมดระบุตัวเลข";
  }

  for (const line of lines) {
    const displayType = normalizeTicketDisplayType(line.betType, line.displayType);

    if (!customerAllowedDisplayTypes.has(displayType)) {
      return "สมาชิกทั่วไปคีย์โพยได้เฉพาะรายการเลขที่รองรับในโหมดระบุตัวเลข";
    }
  }

  return null;
}

export async function createTicketAction(
  _prevState: TicketActionState,
  formData: FormData,
): Promise<TicketActionState> {
  const session = await requireSession([Role.ADMIN, Role.AGENT, Role.CUSTOMER]);
  const drawId = getString(formData.get("drawId"));
  const selectedCustomerId = getString(formData.get("customerId"));
  const entryMode = getString(formData.get("entryMode"));
  const note = getString(formData.get("note"));
  const linesJson = getString(formData.get("linesJson"));

  if (!drawId || !linesJson) {
    return { error: "กรุณาเลือกงวดและเพิ่มรายการโพย" };
  }

  const parsed = await parseAndValidateLines(linesJson);

  if ("error" in parsed) {
    return { error: parsed.error };
  }

  if (session.role === Role.CUSTOMER) {
    const customerSubmissionError = validateCustomerTicketSubmission(entryMode, parsed.lines);

    if (customerSubmissionError) {
      return { error: customerSubmissionError };
    }
  }

  const draw = await prisma.draw.findUnique({
    where: { id: drawId },
    include: { BetRate: true },
  });

  if (!draw) {
    return { error: "ไม่พบงวดที่เลือก" };
  }

  if (!isDrawAcceptingTickets(draw)) {
    return { error: "งวดนี้ปิดรับโพยแล้ว" };
  }

  const actorContext = await resolveTicketActorContext(session, selectedCustomerId);
  if ("error" in actorContext) {
    return { error: actorContext.error };
  }

  const { customerId, agentId, commissionRole } = actorContext;
  const { payoutProfiles, customerCompatSettings } = await resolvePricingContext(customerId, commissionRole);
  const totals = calculateTicketTotals(
    parsed.lines,
    draw.BetRate,
    payoutProfiles,
    commissionRole,
    customerCompatSettings,
  );
  const pricingMaps = buildPricingMaps(draw.BetRate, payoutProfiles, commissionRole, customerCompatSettings);
  const rateMap = new Map(draw.BetRate.map((rate) => [rate.betType, rate]));
  const ticketId = crypto.randomUUID();
  const now = new Date();

  await prisma.ticket.create({
    data: {
      id: ticketId,
      code: buildCode("TKT"),
      customerId,
      agentId,
      drawId,
      status: TicketStatus.CONFIRMED,
      note: buildTicketEntryNote(note, session.role === Role.CUSTOMER),
      subtotal: totals.subtotal,
      discount: totals.discount,
      total: totals.total,
      updatedAt: now,
      BetItem: {
        create: parsed.lines.map((line) => {
          const rate = rateMap.get(line.betType);

          if (!rate?.isOpen) {
            throw new Error(`${line.betType} ยังไม่เปิดรับ`);
          }

          const pricing = getLinePricing(line, pricingMaps, {
            payout: Number(rate.payout),
            commission: Number(rate.commission),
          });

          return {
            id: crypto.randomUUID(),
            betType: line.betType,
            displayType: line.displayType,
            number: line.number,
            amount: line.amount,
            payoutRate: pricing.payout,
          };
        }),
      },
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/tickets");
  revalidatePath("/dashboard/users");

  return {
    ok: true,
    message: "บันทึกโพยเรียบร้อย",
    redirectTo: "/dashboard/tickets",
  };
}

export async function updateTicketAction(
  _prevState: TicketActionState,
  formData: FormData,
): Promise<TicketActionState> {
  const session = await requireSession([Role.ADMIN, Role.AGENT]);
  const ticketId = getString(formData.get("ticketId"));
  const note = getString(formData.get("note"));
  const linesJson = getString(formData.get("linesJson"));

  if (!ticketId || !linesJson) {
    return { error: "ข้อมูลการแก้ไขโพยไม่ครบ" };
  }

  const parsed = await parseAndValidateLines(linesJson);

  if ("error" in parsed) {
    return { error: parsed.error };
  }

  const ticket = await prisma.ticket.findFirst({
    where:
      session.role === Role.ADMIN
        ? { id: ticketId }
        : {
            id: ticketId,
            ...buildAgentRecordedTicketWhere(session.userId),
          },
    include: {
      Draw: {
        include: {
          BetRate: true,
        },
      },
      User_Ticket_customerIdToUser: true,
    },
  });

  if (!ticket) {
    return { error: "ไม่พบโพยที่ต้องการแก้ไข" };
  }

  if (!isDrawAcceptingTickets(ticket.Draw)) {
    return { error: "งวดนี้ปิดรับโพยแล้ว ไม่สามารถแก้ไขได้" };
  }

  if (ticket.status !== TicketStatus.CONFIRMED) {
    return { error: "โพยนี้ไม่สามารถแก้ไขได้" };
  }

  const commissionRole = ticket.User_Ticket_customerIdToUser.role;
  const existingEntryNote = parseTicketEntryNote(ticket.note);
  const { payoutProfiles, customerCompatSettings } = await resolvePricingContext(ticket.customerId, commissionRole);
  const totals = calculateTicketTotals(
    parsed.lines,
    ticket.Draw.BetRate,
    payoutProfiles,
    commissionRole,
    customerCompatSettings,
  );
  const pricingMaps = buildPricingMaps(
    ticket.Draw.BetRate,
    payoutProfiles,
    commissionRole,
    customerCompatSettings,
  );
  const rateMap = new Map(ticket.Draw.BetRate.map((rate) => [rate.betType, rate]));
  const now = new Date();

  try {
    await prisma.$transaction([
      prisma.betItem.deleteMany({
        where: {
          ticketId,
        },
      }),
      prisma.ticket.update({
        where: {
          id: ticketId,
        },
        data: {
          note: buildTicketEntryNote(note, existingEntryNote.isSelfEntry),
          subtotal: totals.subtotal,
          discount: totals.discount,
          total: totals.total,
          winAmount: 0,
          settledAt: null,
          updatedAt: now,
          BetItem: {
            create: parsed.lines.map((line) => {
              const rate = rateMap.get(line.betType);

              if (!rate?.isOpen) {
                throw new Error(`${line.betType} ยังไม่เปิดรับ`);
              }

              const pricing = getLinePricing(line, pricingMaps, {
                payout: Number(rate.payout),
                commission: Number(rate.commission),
              });

              return {
                id: crypto.randomUUID(),
                betType: line.betType,
                displayType: line.displayType,
                number: line.number,
                amount: line.amount,
                payoutRate: pricing.payout,
              };
            }),
          },
        },
      }),
    ]);
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "ไม่สามารถแก้ไขโพยได้",
    };
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/tickets");
  revalidatePath(`/dashboard/tickets/${ticketId}`);
  revalidatePath(`/dashboard/users/${ticket.customerId}`);

  return {
    ok: true,
    message: "แก้ไขโพยเรียบร้อย",
    redirectTo: `/dashboard/users/${ticket.customerId}?ticketId=${ticketId}`,
  };
}
