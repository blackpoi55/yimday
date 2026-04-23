import { Role } from "@prisma/client";
import { MonitorClient } from "@/components/monitor/monitor-client";
import { requireSession } from "@/lib/auth";
import { getMonitorSnapshot } from "@/lib/monitor-data";

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

export default async function MonitorPage({ searchParams }: MonitorPageProps) {
  await requireSession([Role.ADMIN]);

  const resolvedSearchParams = (await searchParams) ?? {};
  const requestedTab = resolvedSearchParams.tab ?? "two-top";
  const requestedBucket = resolvedSearchParams.bucket ?? "0";
  const snapshot = await getMonitorSnapshot(resolvedSearchParams.drawId);

  if (!snapshot) {
    return <div className="text-center text-sm text-muted-foreground">ยังไม่มีงวดในระบบ</div>;
  }

  const selectedBucket = /^[0-9]$/.test(requestedBucket) ? requestedBucket : "0";
  const selectedTab = ["two-top", "two-bottom", "three-straight", "three-tod", "three-bottom", "run-top", "run-bottom", "two-tod", "over-limit", "search"].includes(requestedTab)
    ? requestedTab
    : "two-top";

  return (
    <MonitorClient
      detailRows={snapshot.detailRows}
      draws={snapshot.draws}
      limitByType={snapshot.limitByType}
      overLimit={snapshot.overLimit}
      runBottom={buildSingleDigitRow(snapshot.totalsByType.RUN_BOTTOM ?? {})}
      runTop={buildSingleDigitRow(snapshot.totalsByType.RUN_TOP ?? {})}
      selectedBucket={selectedBucket}
      selectedDrawId={snapshot.selectedDraw.id}
      selectedTab={selectedTab}
      threeBottomGrid={buildThreeDigitGrid(selectedBucket, snapshot.totalsByType.THREE_BOTTOM ?? {})}
      threeStraightGrid={buildThreeDigitGrid(selectedBucket, snapshot.totalsByType.THREE_STRAIGHT ?? {})}
      threeTodTop={rankNumbers(snapshot.threeTodTotals, 100)}
      twoBottomGrid={buildTwoDigitGrid(snapshot.totalsByType.TWO_BOTTOM ?? {})}
      twoTodGrid={buildTwoDigitGrid(snapshot.twoTodTotals)}
      twoTopGrid={buildTwoDigitGrid(snapshot.totalsByType.TWO_TOP ?? {})}
    />
  );
}
