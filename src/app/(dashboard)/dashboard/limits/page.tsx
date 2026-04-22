import { BetType, Role } from "@prisma/client";
import { LimitsPageClient } from "@/components/limits/limits-page-client";
import { requireSession } from "@/lib/auth";
import { getBlockedNumbers } from "@/lib/php-compat-store";
import { prisma } from "@/lib/prisma";

type LimitsPageProps = {
  searchParams?: Promise<{
    drawId?: string;
    tab?: string;
  }>;
};

function getLimitValue(draw: { BetRate: Array<{ betType: BetType; limitPerNumber: unknown }> }, betType: BetType) {
  const rate = draw.BetRate.find((item) => item.betType === betType);
  return rate?.limitPerNumber ? Number(rate.limitPerNumber) : 0;
}

export default async function LimitsPage({ searchParams }: LimitsPageProps) {
  await requireSession([Role.ADMIN]);
  const resolvedSearchParams = (await searchParams) ?? {};
  const selectedTab =
    resolvedSearchParams.tab === "twoTop" ||
    resolvedSearchParams.tab === "twoBottom" ||
    resolvedSearchParams.tab === "threeTop" ||
    resolvedSearchParams.tab === "threeBottom"
      ? resolvedSearchParams.tab
      : "limit";

  const [draws, blockedNumbers] = await Promise.all([
    prisma.draw.findMany({
      orderBy: {
        drawDate: "desc",
      },
      include: {
        BetRate: true,
      },
    }),
    getBlockedNumbers(),
  ]);

  if (draws.length === 0) {
    return (
      <div className="panel">
        <div className="panel-body text-center text-sm text-muted-foreground">ยังไม่มีงวดในระบบ</div>
      </div>
    );
  }

  const selectedDraw = draws.find((draw) => draw.id === resolvedSearchParams.drawId) ?? draws[0];

  return (
    <LimitsPageClient
      blockedNumbers={blockedNumbers}
      draws={draws.map((draw) => ({ id: draw.id, name: draw.name }))}
      limits={{
        twoTop: getLimitValue(selectedDraw, BetType.TWO_TOP),
        twoBottom: getLimitValue(selectedDraw, BetType.TWO_BOTTOM),
        threeTop: getLimitValue(selectedDraw, BetType.THREE_STRAIGHT),
        threeBottom: getLimitValue(selectedDraw, BetType.THREE_BOTTOM),
        threeTod: getLimitValue(selectedDraw, BetType.THREE_TOD),
      }}
      selectedDrawId={selectedDraw.id}
      selectedTab={selectedTab}
    />
  );
}
