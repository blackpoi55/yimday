import { Role } from "@prisma/client";
import { ResultsPageClient } from "@/components/draws/results-page-client";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function ResultsPage() {
  await requireSession([Role.ADMIN]);

  const draws = await prisma.draw.findMany({
    orderBy: {
      drawDate: "desc",
    },
    include: {
      DrawResult: true,
    },
  });

  return (
    <div className="legacy-container">
      <div className="mb-6" />
      <h4 className="mb-8 text-[30px] font-medium text-[#333]">ข้อมูลการปิดหวย</h4>
      <ResultsPageClient
        draws={draws.map((draw) => ({
          id: draw.id,
          name: draw.name,
          result: draw.DrawResult
            ? {
                firstPrize: draw.DrawResult.firstPrize,
                firstPrizeAdjacent: draw.DrawResult.firstPrizeAdjacent,
                secondPrize: draw.DrawResult.secondPrize,
                thirdPrize: draw.DrawResult.thirdPrize,
                fourthPrize: draw.DrawResult.fourthPrize,
                fifthPrize: draw.DrawResult.fifthPrize,
                top3: draw.DrawResult.top3,
                top2: draw.DrawResult.top2,
                bottom3: draw.DrawResult.bottom3,
                bottom2: draw.DrawResult.bottom2,
                front3: draw.DrawResult.front3,
                front3Second: draw.DrawResult.front3Second,
                back3: draw.DrawResult.back3,
                back3Second: draw.DrawResult.back3Second,
                notes: draw.DrawResult.notes,
              }
            : null,
        }))}
      />
    </div>
  );
}
