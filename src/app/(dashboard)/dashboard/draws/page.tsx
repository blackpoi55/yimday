import { DrawStatus, Role } from "@prisma/client";
import { DrawsPageClient } from "@/components/draws/draws-page-client";
import { requireSession } from "@/lib/auth";
import { toDateInputValue, toTimeInputValue } from "@/lib/dates";
import { prisma } from "@/lib/prisma";

function toIsoDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

function toClock(value: Date) {
  return value.toTimeString().slice(0, 8);
}

export default async function DrawsPage() {
  await requireSession([Role.ADMIN]);

  const draws = await prisma.draw.findMany({
    orderBy: {
      drawDate: "desc",
    },
    include: {
      Ticket: true,
      DrawResult: true,
    },
  });

  const openDraw = draws.find((draw) => draw.status === DrawStatus.OPEN) ?? null;
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  return (
    <DrawsPageClient
      defaults={{
        name: `${now.getDate()} ${now.toLocaleString("th-TH", { month: "long" })} ${now.getFullYear()}`,
        openDate: toDateInputValue(now),
        openTime: toTimeInputValue(now),
        closeDate: toDateInputValue(tomorrow),
        closeTime: toTimeInputValue(now),
        drawDate: toDateInputValue(tomorrow),
      }}
      draws={draws.map((draw) => ({
        id: draw.id,
        name: draw.name,
        drawDate: toDateInputValue(draw.drawDate),
        openDate: toIsoDate(draw.openAt),
        openTime: toClock(draw.openAt),
        closeDate: toIsoDate(draw.closeAt),
        closeTime: toClock(draw.closeAt),
        status: draw.status,
        notes: draw.notes,
        result: draw.DrawResult
          ? {
              top3: draw.DrawResult.top3,
              top2: draw.DrawResult.top2,
              bottom3: draw.DrawResult.bottom3,
              bottom2: draw.DrawResult.bottom2,
              front3: draw.DrawResult.front3,
              back3: draw.DrawResult.back3,
              notes: draw.DrawResult.notes,
            }
          : null,
      }))}
      hasOpenDraw={Boolean(openDraw)}
    />
  );
}
