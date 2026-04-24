import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getTicketRecorderLabel, parseTicketEntryNote } from "@/lib/ticket-entry-source";
import { normalizeTicketDisplayType } from "@/lib/ticket-line";
import { buildTicketDisplayNameMap, getTicketDisplayName } from "@/lib/ticket-display";
import { toNumber } from "@/lib/utils";

export type MonitorDetailRow = {
  id: string;
  ticketId: string;
  customerId: string;
  agentId: string;
  betType: string;
  displayType: string | null;
  number: string;
  amount: number;
  customerName: string;
  ticketCode: string;
  ticketName: string;
  agentName: string;
  createdAt: string;
};

export type MonitorOverLimitItem = {
  betType: string;
  number: string;
  total: number;
  limit: number;
  overBy: number;
};

export type MonitorSnapshot = {
  draws: Array<{ id: string; name: string; closeAt: string; status: string }>;
  selectedDraw: { id: string; name: string; closeAt: string; openAt: string; status: string };
  limitByType: Record<string, number | null>;
  totalsByType: Record<string, Record<string, number>>;
  threeTodTotals: Record<string, number>;
  twoTodTotals: Record<string, number>;
  overLimit: MonitorOverLimitItem[];
  detailRows: MonitorDetailRow[];
  updatedAt: string;
};

function canonicalDigits(value: string) {
  return value.split("").sort().join("");
}

export async function getMonitorSnapshot(selectedDrawId?: string): Promise<MonitorSnapshot | null> {
  const draws = await prisma.draw.findMany({
    orderBy: {
      drawDate: "desc",
    },
    include: {
      BetRate: true,
    },
  });

  if (draws.length === 0) {
    return null;
  }

  const selectedDraw = draws.find((draw) => draw.id === selectedDrawId) ?? draws[0];

  const [betItems, betItemSplits] = await Promise.all([
    prisma.betItem.findMany({
      where: {
        Ticket: {
          drawId: selectedDraw.id,
        },
      },
      include: {
        Ticket: {
          include: {
            User_Ticket_agentIdToUser: true,
            User_Ticket_customerIdToUser: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    }),
    prisma.$queryRaw<Array<{ betItemId: string; amount: Prisma.Decimal | number | string }>>`
      SELECT "betItemId", SUM("amount") AS "amount"
      FROM "BetItemSplit"
      WHERE "drawId" = ${selectedDraw.id}
      GROUP BY "betItemId"
    `,
  ]);

  const splitTotalsByBetItemId = betItemSplits.reduce<Record<string, number>>((acc, split) => {
    acc[split.betItemId] = (acc[split.betItemId] ?? 0) + toNumber(split.amount);
    return acc;
  }, {});

  const activeBetItems = betItems
    .map((item) => {
      const splitAmount = splitTotalsByBetItemId[item.id] ?? 0;
      const remainingAmount = Math.max(0, toNumber(item.amount) - splitAmount);

      return {
        ...item,
        remainingAmount,
      };
    })
    .filter((item) => item.remainingAmount > 0);

  const totalsByType = activeBetItems.reduce<Record<string, Record<string, number>>>((acc, item) => {
    const typeKey = normalizeTicketDisplayType(item.betType, item.displayType);
    acc[typeKey] ??= {};
    acc[typeKey][item.number] = (acc[typeKey][item.number] ?? 0) + item.remainingAmount;
    return acc;
  }, {});

  const threeTodTotals = activeBetItems
    .filter((item) => item.betType === "THREE_TOD")
    .reduce<Record<string, number>>((acc, item) => {
      const key = canonicalDigits(item.number);
      acc[key] = (acc[key] ?? 0) + item.remainingAmount;
      return acc;
    }, {});

  const twoTodTotals = activeBetItems
    .filter((item) => normalizeTicketDisplayType(item.betType, item.displayType) === "TWO_TOD")
    .reduce<Record<string, number>>((acc, item) => {
      const key = canonicalDigits(item.number);
      acc[key] = (acc[key] ?? 0) + item.remainingAmount;
      return acc;
    }, {});

  const limitByType = selectedDraw.BetRate.reduce<Record<string, number | null>>((acc, rate) => {
    acc[rate.betType] = rate.limitPerNumber ? Number(rate.limitPerNumber) : null;
    return acc;
  }, {});
  limitByType.TWO_TOD = limitByType.TWO_TOP ?? null;

  const standardOverLimit: MonitorOverLimitItem[] = selectedDraw.BetRate.flatMap((rate) => {
    const limit = rate.limitPerNumber ? Number(rate.limitPerNumber) : null;
    if (!limit) {
      return [];
    }

    return Object.entries(totalsByType[rate.betType] ?? {})
      .filter(([, total]) => total > limit)
      .map(([number, total]) => ({
        betType: rate.betType,
        number,
        total,
        limit,
        overBy: total - limit,
      }));
  });
  const twoTodOverLimit: MonitorOverLimitItem[] = Object.entries(totalsByType.TWO_TOD ?? {})
    .filter(([, total]) => {
      const limit = limitByType.TWO_TOD;
      return typeof limit === "number" && total > limit;
    })
    .map(([number, total]) => ({
      betType: "TWO_TOD",
      number,
      total,
      limit: limitByType.TWO_TOD ?? 0,
      overBy: total - (limitByType.TWO_TOD ?? 0),
    }));
  const overLimit: MonitorOverLimitItem[] = [...standardOverLimit, ...twoTodOverLimit].sort(
    (a, b) => b.overBy - a.overBy,
  );

  const ticketLabelMap = buildTicketDisplayNameMap(
    Array.from(
      new Map(
        activeBetItems.map((item) => [
          item.Ticket.id,
          {
            id: item.Ticket.id,
            customerId: item.Ticket.customerId,
            drawId: item.Ticket.drawId,
            createdAt: item.Ticket.createdAt,
          },
        ]),
      ).values(),
    ),
  );

  const detailRows = activeBetItems.map((item) => {
    const parsedEntryNote = parseTicketEntryNote(item.Ticket.note);

    return {
      id: item.id,
      ticketId: item.Ticket.id,
      customerId: item.Ticket.customerId,
      agentId: item.Ticket.agentId,
      betType: item.betType,
      displayType: item.displayType,
      number: item.number,
      amount: item.remainingAmount,
      customerName: item.Ticket.User_Ticket_customerIdToUser.name,
      ticketCode: item.Ticket.code,
      ticketName: getTicketDisplayName(item.Ticket.id, ticketLabelMap, item.Ticket.code),
      agentName: getTicketRecorderLabel(item.Ticket.User_Ticket_agentIdToUser.name, parsedEntryNote.isSelfEntry),
      createdAt: item.createdAt.toISOString(),
    };
  });

  return {
    draws: draws.map((draw) => ({ id: draw.id, name: draw.name, closeAt: draw.closeAt.toISOString(), status: draw.status })),
    selectedDraw: {
      id: selectedDraw.id,
      name: selectedDraw.name,
      closeAt: selectedDraw.closeAt.toISOString(),
      openAt: selectedDraw.openAt.toISOString(),
      status: selectedDraw.status,
    },
    limitByType,
    totalsByType,
    threeTodTotals,
    twoTodTotals,
    overLimit,
    detailRows,
    updatedAt: new Date().toISOString(),
  };
}
