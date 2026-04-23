import { BetType, Role } from "@prisma/client";
import { RealtimeMonitorClient } from "@/components/realtime/realtime-monitor-client";
import { requireSession } from "@/lib/auth";
import { betTypeLabels } from "@/lib/constants";
import { getMonitorSnapshot } from "@/lib/monitor-data";

type RealtimePageProps = {
  searchParams?: Promise<{
    drawId?: string;
  }>;
};

const monitorTabByType: Partial<Record<BetType, string>> = {
  TWO_TOP: "two-top",
  TWO_BOTTOM: "two-bottom",
  THREE_STRAIGHT: "three-straight",
  THREE_TOD: "three-tod",
  THREE_BOTTOM: "three-bottom",
  RUN_TOP: "run-top",
  RUN_BOTTOM: "run-bottom",
};

function getMonitorHref(drawId: string, betType: string, number: string) {
  const typedBetType = betType as BetType;
  const tab = monitorTabByType[typedBetType];

  if (!tab) {
    return `/dashboard/monitor?drawId=${drawId}&tab=search`;
  }

  const params = new URLSearchParams({ drawId, tab });

  if (
    (typedBetType === BetType.THREE_STRAIGHT || typedBetType === BetType.THREE_BOTTOM || typedBetType === BetType.THREE_TOD) &&
    number.length > 0
  ) {
    params.set("bucket", number[0]!);
  }

  return `/dashboard/monitor?${params.toString()}`;
}

export default async function RealtimePage({ searchParams }: RealtimePageProps) {
  await requireSession([Role.ADMIN]);

  const resolvedSearchParams = (await searchParams) ?? {};
  const snapshot = await getMonitorSnapshot(resolvedSearchParams.drawId);

  if (!snapshot) {
    return <div className="text-center text-sm text-muted-foreground">ยังไม่มีงวดในระบบ</div>;
  }

  const redTotalStake = snapshot.overLimit.reduce((sum, item) => sum + item.total, 0);
  const redTotalOver = snapshot.overLimit.reduce((sum, item) => sum + item.overBy, 0);

  const summaryByType = Object.values(
    snapshot.overLimit.reduce<
      Record<
        string,
        {
          betType: string;
          label: string;
          count: number;
          total: number;
          totalOver: number;
          maxOver: number;
          hottestNumber: string;
        }
      >
    >((acc, item) => {
      acc[item.betType] ??= {
        betType: item.betType,
        label: betTypeLabels[item.betType as BetType] ?? item.betType,
        count: 0,
        total: 0,
        totalOver: 0,
        maxOver: 0,
        hottestNumber: item.number,
      };

      acc[item.betType].count += 1;
      acc[item.betType].total += item.total;
      acc[item.betType].totalOver += item.overBy;

      if (item.overBy > acc[item.betType].maxOver) {
        acc[item.betType].maxOver = item.overBy;
        acc[item.betType].hottestNumber = item.number;
      }

      return acc;
    }, {}),
  ).sort((a, b) => b.totalOver - a.totalOver);

  const nearLimit = Object.entries(snapshot.totalsByType)
    .flatMap(([betType, numbers]) => {
      const limit = snapshot.limitByType[betType];
      if (!limit || limit <= 0) {
        return [];
      }

      return Object.entries(numbers)
        .filter(([, total]) => total < limit && total / limit >= 0.8)
        .map(([number, total]) => ({
          betType,
          label: betTypeLabels[betType as BetType] ?? betType,
          number,
          total,
          limit,
          usagePercent: (total / limit) * 100,
          monitorHref: getMonitorHref(snapshot.selectedDraw.id, betType, number),
        }));
    })
    .sort((a, b) => b.usagePercent - a.usagePercent)
    .slice(0, 12);

  const overLimit = snapshot.overLimit.map((item) => ({
    ...item,
    label: betTypeLabels[item.betType as BetType] ?? item.betType,
    usagePercent: item.limit > 0 ? (item.total / item.limit) * 100 : 0,
    monitorHref: getMonitorHref(snapshot.selectedDraw.id, item.betType, item.number),
  }));

  const recentRows = snapshot.detailRows.slice(0, 15).map((row) => ({
    ...row,
    label: betTypeLabels[row.betType as BetType] ?? row.betType,
  }));

  return (
    <RealtimeMonitorClient
      draws={snapshot.draws}
      nearLimit={nearLimit}
      overLimit={overLimit}
      recentRows={recentRows}
      redCount={snapshot.overLimit.length}
      redTotalOver={redTotalOver}
      redTotalStake={redTotalStake}
      redTypeCount={summaryByType.length}
      selectedDrawId={snapshot.selectedDraw.id}
      summaryByType={summaryByType}
      updatedAt={snapshot.updatedAt}
    />
  );
}
