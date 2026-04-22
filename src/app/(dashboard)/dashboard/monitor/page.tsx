import { Role } from "@prisma/client";
import { MonitorClient } from "@/components/monitor/monitor-client";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildTicketDisplayNameMap, getTicketDisplayName } from "@/lib/ticket-display";

type MonitorPageProps = {
  searchParams?: Promise<{
    drawId?: string;
    tab?: string;
    bucket?: string;
  }>;
};

function buildTwoDigitGrid(totals: Record<string, number>) {
  return Array.from({ length: 10 }, (_, row) =>
    Array.from({ length: 10 }, (_, col) => {
      const number = `${row}${col}`;
      return {
        number,
        total: totals[number] ?? 0,
      };
    }),
  );
}

function buildSingleDigitRow(totals: Record<string, number>) {
  return Array.from({ length: 10 }, (_, index) => ({
    number: `${index}`,
    total: totals[`${index}`] ?? 0,
  }));
}

function buildThreeDigitGrid(bucket: string, totals: Record<string, number>) {
  return Array.from({ length: 10 }, (_, row) =>
    Array.from({ length: 10 }, (_, col) => {
      const number = `${bucket}${row}${col}`;
      return {
        number,
        total: totals[number] ?? 0,
      };
    }),
  );
}

function rankNumbers(totals: Record<string, number>, size = 100) {
  return Object.entries(totals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, size)
    .map(([number, total]) => ({ number, total }));
}

function canonicalThreeTod(number: string) {
  return number.split("").sort().join("");
}

function canonicalTwoTod(number: string) {
  return number.split("").sort().join("");
}

export default async function MonitorPage({ searchParams }: MonitorPageProps) {
  await requireSession([Role.ADMIN]);

  const resolvedSearchParams = (await searchParams) ?? {};
  const requestedTab = resolvedSearchParams.tab ?? "two-top";
  const requestedBucket = resolvedSearchParams.bucket ?? "0";

  const draws = await prisma.draw.findMany({
    orderBy: {
      drawDate: "desc",
    },
    include: {
      BetRate: true,
    },
  });

  if (draws.length === 0) {
    return <div className="text-center text-sm text-muted-foreground">ยังไม่มีงวดในระบบ</div>;
  }

  const selectedDraw = draws.find((draw) => draw.id === resolvedSearchParams.drawId) ?? draws[0];

  const [grouped, betItems] = await Promise.all([
    prisma.betItem.groupBy({
      by: ["betType", "number"],
      where: {
        Ticket: {
          drawId: selectedDraw.id,
        },
      },
      _sum: {
        amount: true,
      },
    }),
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
  ]);

  const totalsByType = grouped.reduce<Record<string, Record<string, number>>>((acc, item) => {
    const total = Number(item._sum.amount ?? 0);
    acc[item.betType] ??= {};
    acc[item.betType][item.number] = total;
    return acc;
  }, {});

  const threeTodTotals = betItems
    .filter((item) => item.betType === "THREE_TOD")
    .reduce<Record<string, number>>((acc, item) => {
      const key = canonicalThreeTod(item.number);
      acc[key] = (acc[key] ?? 0) + Number(item.amount);
      return acc;
    }, {});

  const twoTodTotals = betItems
    .filter((item) => item.betType === "TWO_TOP")
    .reduce<Record<string, number>>((acc, item) => {
      if (item.number.length !== 2) {
        return acc;
      }

      const key = canonicalTwoTod(item.number);
      acc[key] = (acc[key] ?? 0) + Number(item.amount);
      return acc;
    }, {});

  const limitByType = selectedDraw.BetRate.reduce<Record<string, number | null>>((acc, rate) => {
    acc[rate.betType] = rate.limitPerNumber ? Number(rate.limitPerNumber) : null;
    return acc;
  }, {});

  const overLimit = selectedDraw.BetRate.flatMap((rate) => {
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
  }).sort((a, b) => b.overBy - a.overBy);

  const detailRows = betItems.map((item) => ({
    id: item.id,
    betType: item.betType,
    number: item.number,
    amount: Number(item.amount),
    customerName: item.Ticket.User_Ticket_customerIdToUser.name,
    ticketCode: item.Ticket.code,
    agentName: item.Ticket.User_Ticket_agentIdToUser.name,
    createdAt: item.createdAt.toISOString(),
    note: item.Ticket.note,
    ticketId: item.Ticket.id,
    customerId: item.Ticket.customerId,
    ticketCreatedAt: item.Ticket.createdAt.toISOString(),
  }));

  const ticketLabelMap = buildTicketDisplayNameMap(
    betItems.map((item) => ({
      id: item.Ticket.id,
      customerId: item.Ticket.customerId,
      drawId: item.Ticket.drawId,
      createdAt: item.Ticket.createdAt,
    })),
  );

  const detailRowsWithLabels = detailRows.map((row) => ({
    ...row,
    ticketName: getTicketDisplayName(row.ticketId, ticketLabelMap, row.ticketCode),
  }));

  const selectedBucket = /^[0-9]$/.test(requestedBucket) ? requestedBucket : "0";
  const selectedTab = ["two-top", "two-bottom", "three-straight", "three-tod", "three-bottom", "run-top", "run-bottom", "two-tod", "over-limit", "search"].includes(requestedTab)
    ? requestedTab
    : "two-top";

  return (
    <MonitorClient
      detailRows={detailRowsWithLabels}
      draws={draws.map((draw) => ({ id: draw.id, name: draw.name }))}
      limitByType={limitByType}
      overLimit={overLimit}
      runBottom={buildSingleDigitRow(totalsByType.RUN_BOTTOM ?? {})}
      runTop={buildSingleDigitRow(totalsByType.RUN_TOP ?? {})}
      selectedBucket={selectedBucket}
      selectedDrawId={selectedDraw.id}
      selectedTab={selectedTab}
      threeBottomGrid={buildThreeDigitGrid(selectedBucket, totalsByType.THREE_BOTTOM ?? {})}
      threeStraightGrid={buildThreeDigitGrid(selectedBucket, totalsByType.THREE_STRAIGHT ?? {})}
      threeTodTop={rankNumbers(threeTodTotals, 100)}
      twoBottomGrid={buildTwoDigitGrid(totalsByType.TWO_BOTTOM ?? {})}
      twoTodGrid={buildTwoDigitGrid(twoTodTotals)}
      twoTopGrid={buildTwoDigitGrid(totalsByType.TWO_TOP ?? {})}
    />
  );
}
