"use server";

import { DrawStatus, Role } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { defaultBetRates } from "@/lib/constants";
import { evaluateBet } from "@/lib/bet-utils";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { buildCode, createDateTime, getString, toNumber } from "@/lib/utils";

function normalizePrizeList(rawValue: string, digits: number, expectedCount: number, label: string) {
  const tokens = rawValue
    .split(/[\s,]+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => item.replace(/\D/g, ""));

  if (tokens.length === 0) {
    return null;
  }

  const invalid = tokens.find((item) => item.length !== digits);
  if (invalid) {
    throw new Error(`${label} ต้องเป็นตัวเลข ${digits} หลักทุกตัว`);
  }

  if (tokens.length !== expectedCount) {
    throw new Error(`${label} ต้องกรอก ${expectedCount} เลข`);
  }

  return tokens.join("\n");
}

export async function createDrawAction(formData: FormData) {
  const session = await requireSession([Role.ADMIN]);
  const name = getString(formData.get("name"));
  const drawDate = getString(formData.get("drawDate"));
  const openDate = getString(formData.get("openDate"));
  const openTime = getString(formData.get("openTime"));
  const closeDate = getString(formData.get("closeDate"));
  const closeTime = getString(formData.get("closeTime"));
  const notes = getString(formData.get("notes"));

  if (!name || !drawDate || !openDate || !openTime || !closeDate || !closeTime) {
    throw new Error("กรุณากรอกข้อมูลงวดให้ครบ");
  }

  const drawCount = await prisma.draw.count();

  if (drawCount > 1) {
    const oldestDraw = await prisma.draw.findFirst({
      orderBy: {
        drawDate: "asc",
      },
      select: {
        name: true,
      },
    });

    throw new Error(`กรุณาล้างงวดเก่า "${oldestDraw?.name ?? "-"}" ออกก่อน แล้วจึงเปิดงวดถัดไป`);
  }

  const openAt = createDateTime(openDate, openTime);
  const closeAt = createDateTime(closeDate, closeTime);
  const drawAt = createDateTime(drawDate, closeTime);

  if (openAt >= closeAt) {
    throw new Error("เวลาเปิดรับโพยต้องน้อยกว่าเวลาปิด");
  }

  const drawId = crypto.randomUUID();
  const now = new Date();

  await prisma.draw.create({
    data: {
      id: drawId,
      code: buildCode("DRAW"),
      name,
      drawDate: drawAt,
      openAt,
      closeAt,
      status: openAt > now ? DrawStatus.UPCOMING : DrawStatus.OPEN,
      notes: notes || null,
      createdById: session.userId,
      updatedAt: now,
      BetRate: {
        create: defaultBetRates.map((rate) => ({
          id: crypto.randomUUID(),
          betType: rate.betType,
          payout: rate.payout,
          commission: rate.commission,
          isOpen: true,
          updatedAt: now,
        })),
      },
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/draws");
  revalidatePath("/dashboard/rates");
}

export async function clearOldDrawAction(formData: FormData) {
  await requireSession([Role.ADMIN]);

  const drawId = getString(formData.get("drawId"));

  if (!drawId) {
    throw new Error("ไม่พบงวดที่ต้องการล้าง");
  }

  const oldestDraw = await prisma.draw.findFirst({
    orderBy: {
      drawDate: "asc",
    },
    select: {
      id: true,
      name: true,
    },
  });

  const latestDraw = await prisma.draw.findFirst({
    orderBy: {
      drawDate: "desc",
    },
    select: {
      id: true,
    },
  });

  if (!oldestDraw || !latestDraw || oldestDraw.id === latestDraw.id) {
    throw new Error("ยังไม่มีงวดเก่าที่ล้างได้");
  }

  if (oldestDraw.id !== drawId) {
    throw new Error("ต้องล้างงวดที่เก่ากว่าก่อน และเก็บงวดล่าสุดไว้");
  }

  await prisma.$transaction(async (tx) => {
    await tx.betItemSplit.deleteMany({
      where: {
        drawId,
      },
    });

    await tx.blockedNumber.deleteMany({
      where: {
        drawId,
      },
    });

    await tx.drawResult.deleteMany({
      where: {
        drawId,
      },
    });

    await tx.betRate.deleteMany({
      where: {
        drawId,
      },
    });

    await tx.ticket.deleteMany({
      where: {
        drawId,
      },
    });

    await tx.draw.delete({
      where: {
        id: drawId,
      },
    });
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/draws");
  revalidatePath("/dashboard/rates");
  revalidatePath("/dashboard/results");
  revalidatePath("/dashboard/winners");
  revalidatePath("/dashboard/tickets");
}

export async function updateDrawAction(formData: FormData) {
  await requireSession([Role.ADMIN]);

  const drawId = getString(formData.get("drawId"));
  const name = getString(formData.get("name"));
  const drawDate = getString(formData.get("drawDate"));
  const openDate = getString(formData.get("openDate"));
  const openTime = getString(formData.get("openTime"));
  const closeDate = getString(formData.get("closeDate"));
  const closeTime = getString(formData.get("closeTime"));
  const notes = getString(formData.get("notes"));

  if (!drawId || !name || !drawDate || !openDate || !openTime || !closeDate || !closeTime) {
    throw new Error("ข้อมูลแก้งวดไม่ครบ");
  }

  const openAt = createDateTime(openDate, openTime);
  const closeAt = createDateTime(closeDate, closeTime);
  const drawAt = createDateTime(drawDate, closeTime);

  if (openAt >= closeAt) {
    throw new Error("เวลาเปิดต้องน้อยกว่าเวลาปิด");
  }

  await prisma.draw.update({
    where: { id: drawId },
    data: {
      name,
      drawDate: drawAt,
      openAt,
      closeAt,
      notes: notes || null,
      updatedAt: new Date(),
    },
  });

  revalidatePath("/dashboard/draws");
  revalidatePath("/dashboard/results");
}

export async function updateDrawStatusAction(formData: FormData) {
  await requireSession([Role.ADMIN]);
  const drawId = getString(formData.get("drawId"));
  const status = getString(formData.get("status")) as DrawStatus;

  if (!drawId || !status) {
    throw new Error("ข้อมูลการอัปเดตงวดไม่ครบ");
  }

  const isOpen = status === DrawStatus.OPEN;

  await prisma.$transaction([
    prisma.draw.update({
      where: { id: drawId },
      data: {
        status,
        updatedAt: new Date(),
      },
    }),
    prisma.betRate.updateMany({
      where: {
        drawId,
      },
      data: {
        isOpen,
        updatedAt: new Date(),
      },
    }),
  ]);

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/draws");
  revalidatePath("/dashboard/rates");
  revalidatePath("/dashboard/results");
}

export async function updateBetRateAction(formData: FormData) {
  await requireSession([Role.ADMIN]);
  const rateId = getString(formData.get("rateId"));
  const payout = Number(getString(formData.get("payout")));
  const commission = Number(getString(formData.get("commission")));
  const limitRaw = getString(formData.get("limitPerNumber"));
  const isOpen = getString(formData.get("isOpen")) === "on";

  await prisma.betRate.update({
    where: { id: rateId },
    data: {
      payout,
      commission,
      limitPerNumber: limitRaw ? Number(limitRaw) : null,
      isOpen,
      updatedAt: new Date(),
    },
  });

  revalidatePath("/dashboard/rates");
  revalidatePath("/dashboard/draws");
  revalidatePath("/dashboard/tickets/new");
}

export async function saveDrawResultAction(formData: FormData) {
  await requireSession([Role.ADMIN]);
  const drawId = getString(formData.get("drawId"));
  const firstPrize = getString(formData.get("firstPrize"));
  const firstPrizeAdjacent = getString(formData.get("firstPrizeAdjacent"));
  const secondPrize = getString(formData.get("secondPrize"));
  const thirdPrize = getString(formData.get("thirdPrize"));
  const fourthPrize = getString(formData.get("fourthPrize"));
  const fifthPrize = getString(formData.get("fifthPrize"));
  const top3 = getString(formData.get("top3"));
  const top2 = getString(formData.get("top2"));
  const bottom2 = getString(formData.get("bottom2"));
  const bottom3 = getString(formData.get("bottom3"));
  const front3 = getString(formData.get("front3"));
  const front3Second = getString(formData.get("front3Second"));
  const back3 = getString(formData.get("back3"));
  const back3Second = getString(formData.get("back3Second"));
  const notes = getString(formData.get("notes"));

  const resolvedTop3 = firstPrize.length === 6 ? firstPrize.slice(-3) : top3;
  const resolvedTop2 = firstPrize.length === 6 ? firstPrize.slice(-2) : top2 || resolvedTop3.slice(-2);

  if (!drawId || firstPrize.length !== 6 || resolvedTop3.length !== 3 || bottom2.length !== 2) {
    throw new Error("กรุณากรอกผลรางวัลหลักให้ครบ");
  }

  const now = new Date();
  const normalizedFirstPrizeAdjacent = normalizePrizeList(firstPrizeAdjacent, 6, 2, "เลขข้างเคียงรางวัลที่ 1");
  const normalizedSecondPrize = normalizePrizeList(secondPrize, 6, 5, "รางวัลที่ 2");
  const normalizedThirdPrize = normalizePrizeList(thirdPrize, 6, 10, "รางวัลที่ 3");
  const normalizedFourthPrize = normalizePrizeList(fourthPrize, 6, 50, "รางวัลที่ 4");
  const normalizedFifthPrize = normalizePrizeList(fifthPrize, 6, 100, "รางวัลที่ 5");

  const resultRecord = {
    firstPrize,
    firstPrizeAdjacent: normalizedFirstPrizeAdjacent,
    secondPrize: normalizedSecondPrize,
    thirdPrize: normalizedThirdPrize,
    fourthPrize: normalizedFourthPrize,
    fifthPrize: normalizedFifthPrize,
    top3: resolvedTop3,
    top2: resolvedTop2,
    bottom2,
    bottom3: bottom3 || null,
    front3: front3 || null,
    front3Second: front3Second || null,
    back3: back3 || null,
    back3Second: back3Second || null,
    notes: notes || null,
    updatedAt: now,
  };

  const tickets = await prisma.ticket.findMany({
    where: {
      drawId,
    },
    include: {
      BetItem: true,
    },
  });

  const itemUpdates = [];
  const ticketUpdates = [];

  for (const ticket of tickets) {
    let ticketWinAmount = 0;

    for (const item of ticket.BetItem) {
      const settlement = evaluateBet(item, resultRecord);
      const payoutRate = toNumber(item.payoutRate);
      const amount = toNumber(item.amount);
      const winAmount = settlement.isWinner ? amount * payoutRate : 0;

      ticketWinAmount += winAmount;

      itemUpdates.push(
        prisma.betItem.update({
          where: { id: item.id },
          data: {
            isWinner: settlement.isWinner,
            hitLabel: settlement.hitLabel,
            winAmount,
          },
        }),
      );
    }

    ticketUpdates.push(
      prisma.ticket.update({
        where: { id: ticket.id },
        data: {
          winAmount: ticketWinAmount,
          settledAt: now,
          updatedAt: now,
        },
      }),
    );
  }

  await prisma.$transaction([
    prisma.draw.update({
      where: { id: drawId },
      data: {
        status: DrawStatus.RESULTED,
        updatedAt: now,
      },
    }),
    prisma.drawResult.upsert({
      where: { drawId },
      create: {
        id: crypto.randomUUID(),
        drawId,
        createdAt: now,
        ...resultRecord,
      },
      update: resultRecord,
    }),
    prisma.betRate.updateMany({
      where: { drawId },
      data: {
        isOpen: false,
        updatedAt: now,
      },
    }),
    ...itemUpdates,
    ...ticketUpdates,
  ]);

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/results");
  revalidatePath("/dashboard/winners");
  revalidatePath("/dashboard/tickets");
  revalidatePath("/dashboard/draws");
}
