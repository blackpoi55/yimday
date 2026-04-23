"use server";

import { Role, TicketStatus } from "@prisma/client";
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
import { compatSettingsToCommissionEntries } from "@/lib/php-compat-shared";
import { getPayoutProfiles } from "@/lib/payouts";
import { prisma } from "@/lib/prisma";
import { buildCode, getString } from "@/lib/utils";

export type TicketActionState = {
  error?: string;
  ok?: boolean;
  message?: string;
  redirectTo?: string;
};

async function parseAndValidateLines(linesJson: string) {
  let rawLines: TicketLineInput[] = [];

  try {
    rawLines = JSON.parse(linesJson) as TicketLineInput[];
  } catch {
    return { error: "ข้อมูลรายการโพยไม่ถูกต้อง" } as const;
  }

  if (!Array.isArray(rawLines) || rawLines.length === 0) {
    return { error: "ยังไม่มีรายการโพย" } as const;
  }

  const lines = rawLines.map((line) => ({
    betType: line.betType,
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
      return { error: `เลข ${line.number} ถูกตั้งเป็นเลขเต็มแล้ว` } as const;
    }
  }

  return { lines } as const;
}

export async function createTicketAction(
  _prevState: TicketActionState,
  formData: FormData,
): Promise<TicketActionState> {
  const session = await requireSession([Role.ADMIN, Role.AGENT, Role.CUSTOMER]);
  const drawId = getString(formData.get("drawId"));
  const selectedCustomerId = getString(formData.get("customerId"));
  const note = getString(formData.get("note"));
  const linesJson = getString(formData.get("linesJson"));

  if (!drawId || !linesJson) {
    return { error: "กรุณาเลือกงวดและเพิ่มรายการคีย์โพย" };
  }

  const parsed = await parseAndValidateLines(linesJson);

  if ("error" in parsed) {
    return { error: parsed.error };
  }

  const { lines } = parsed;

  const draw = await prisma.draw.findUnique({
    where: { id: drawId },
    include: { BetRate: true },
  });

  if (!draw) {
    return { error: "ไม่พบงวดที่เลือก" };
  }

  if (!isDrawAcceptingTickets(draw)) {
    return { error: "งวดนี้ยังไม่อยู่ในช่วงรับโพย หรือปิดรับโพยแล้ว" };
  }

  let customerId = selectedCustomerId;
  let agentId = session.userId;
  let commissionRole: Role = Role.CUSTOMER;

  if (session.role === Role.CUSTOMER) {
    const customer = await prisma.user.findUnique({
      where: { id: session.userId },
    });

    if (!customer?.ownerAgentId) {
      return { error: "บัญชีลูกค้ายังไม่ได้ผูกกับพนักงาน" };
    }

    customerId = session.userId;
    agentId = customer.ownerAgentId;
    commissionRole = customer.role;
  }

  if (session.role === Role.AGENT) {
    if (!customerId) {
      return { error: "กรุณาเลือกลูกค้า" };
    }

    const customer = await prisma.user.findFirst({
      where: {
        id: customerId,
        ...buildAgentCustomerWhere(session.userId),
      },
    });

    if (!customer) {
      return { error: "ไม่พบข้อมูลลูกค้าที่เลือก" };
    }

    commissionRole = customer.role;
  }

  if (session.role === Role.ADMIN) {
    if (!customerId) {
      return { error: "กรุณาเลือกลูกค้า" };
    }

    const customer = await prisma.user.findFirst({
      where: {
        id: customerId,
        role: Role.CUSTOMER,
      },
    });

    if (!customer) {
      return { error: "ไม่พบข้อมูลลูกค้าที่เลือก" };
    }

    if (!customer.ownerAgentId && !customer.isSharedMember) {
      return { error: "ลูกค้ารายนี้ยังไม่ได้ผูกกับพนักงาน จึงยังคีย์โพยแทนไม่ได้" };
    }

    agentId = customer.ownerAgentId ?? session.userId;
    commissionRole = customer.role;
  }

  const payoutProfiles = await getPayoutProfiles(commissionRole);
  const customerCompatSettings = await getUserCompatSettings(customerId);
  const effectiveProfiles = [
    ...payoutProfiles.map((item) => ({
      role: item.role,
      betType: item.betType,
      commission: Number(item.commission),
    })),
    ...compatSettingsToCommissionEntries(customerCompatSettings, commissionRole),
  ];

  const totals = calculateTicketTotals(lines, draw.BetRate, effectiveProfiles, commissionRole);
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
      note: note || null,
      subtotal: totals.subtotal,
      discount: totals.discount,
      total: totals.total,
      updatedAt: now,
      BetItem: {
        create: lines.map((line) => {
          const rate = draw.BetRate.find((item) => item.betType === line.betType);

          if (!rate?.isOpen) {
            throw new Error(`ประเภท ${line.betType} ปิดรับแล้ว`);
          }

          return {
            id: crypto.randomUUID(),
            betType: line.betType,
            number: line.number,
            amount: line.amount,
            payoutRate: rate.payout,
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
    return { error: "ข้อมูลโพยไม่ครบ" };
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
            agentId: session.userId,
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
    return { error: "งวดนี้ยังไม่อยู่ในช่วงรับโพย หรือปิดรับโพยแล้ว จึงแก้โพยไม่ได้" };
  }

  if (ticket.status !== TicketStatus.CONFIRMED) {
    return { error: "แก้ไขได้เฉพาะโพยที่ยืนยันแล้วเท่านั้น" };
  }

  const commissionRole = ticket.User_Ticket_customerIdToUser.role;
  const payoutProfiles = await getPayoutProfiles(commissionRole);
  const customerCompatSettings = await getUserCompatSettings(ticket.customerId);
  const effectiveProfiles = [
    ...payoutProfiles.map((item) => ({
      role: item.role,
      betType: item.betType,
      commission: Number(item.commission),
    })),
    ...compatSettingsToCommissionEntries(customerCompatSettings, commissionRole),
  ];
  const totals = calculateTicketTotals(parsed.lines, ticket.Draw.BetRate, effectiveProfiles, commissionRole);
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
          note: note || null,
          subtotal: totals.subtotal,
          discount: totals.discount,
          total: totals.total,
          winAmount: 0,
          settledAt: null,
          updatedAt: now,
          BetItem: {
            create: parsed.lines.map((line) => {
              const rate = ticket.Draw.BetRate.find((item) => item.betType === line.betType);

              if (!rate?.isOpen) {
                throw new Error(`ประเภท ${line.betType} ปิดรับแล้ว`);
              }

              return {
                id: crypto.randomUUID(),
                betType: line.betType,
                number: line.number,
                amount: line.amount,
                payoutRate: rate.payout,
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
