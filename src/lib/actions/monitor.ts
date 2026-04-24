"use server";

import { Prisma, Role } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildCode, getString, toNumber } from "@/lib/utils";

type CreateBetSplitResult =
  | {
      ok: true;
      batchId: string;
      splitTotal: number;
      message: string;
    }
  | {
      ok: false;
      error: string;
    };

function canonicalDigits(value: string) {
  return value.split("").sort().join("");
}

export async function createBetSplitAction(formData: FormData): Promise<CreateBetSplitResult> {
  const session = await requireSession([Role.ADMIN]);

  const drawId = getString(formData.get("drawId"));
  const requestedType = getString(formData.get("betType"));
  const requestedNumber = getString(formData.get("number"));
  const requestedAmount = Number(formData.get("requestedAmount") ?? 0);
  const note = getString(formData.get("note"));

  if (!drawId || !requestedType || !requestedNumber) {
    return { ok: false, error: "ข้อมูลการแบ่งออกไม่ครบ" };
  }

  if (!Number.isFinite(requestedAmount) || requestedAmount <= 0) {
    return { ok: false, error: "จำนวนเงินที่ต้องการแบ่งไม่ถูกต้อง" };
  }

  const baseWhere =
    requestedType === "THREE_TOD"
      ? {
          betType: "THREE_TOD" as const,
          Ticket: { drawId },
        }
      : requestedType === "TWO_TOD"
        ? {
            betType: "TWO_TOP" as const,
            displayType: "TWO_TOD",
            Ticket: { drawId },
          }
        : {
            betType: requestedType as
              | "TWO_TOP"
              | "TWO_BOTTOM"
              | "THREE_STRAIGHT"
              | "THREE_TOD"
              | "THREE_BOTTOM"
              | "FRONT_THREE"
              | "BACK_THREE"
              | "RUN_TOP"
              | "RUN_BOTTOM",
            displayType: requestedType === "TWO_TOP" ? { not: "TWO_TOD" } : undefined,
            number: requestedNumber,
            Ticket: { drawId },
          };

  const items = await prisma.betItem.findMany({
    where: baseWhere,
    orderBy: {
      createdAt: "desc",
    },
  });

  const itemIds = items.map((item) => item.id);
  const splits =
    itemIds.length > 0
      ? await prisma.$queryRaw<Array<{ betItemId: string; amount: Prisma.Decimal | number | string }>>`
          SELECT "betItemId", SUM("amount") AS "amount"
          FROM "BetItemSplit"
          WHERE "drawId" = ${drawId}
            AND "betItemId" IN (${Prisma.join(itemIds)})
          GROUP BY "betItemId"
        `
      : [];

  const splitTotalsByBetItemId = splits.reduce<Record<string, number>>((acc, split) => {
    acc[split.betItemId] = (acc[split.betItemId] ?? 0) + toNumber(split.amount);
    return acc;
  }, {});

  const matchedItems = items
    .filter((item) => {
      if (requestedType === "THREE_TOD") {
        return canonicalDigits(item.number) === requestedNumber;
      }

      if (requestedType === "TWO_TOD") {
        return item.displayType === "TWO_TOD" && canonicalDigits(item.number) === canonicalDigits(requestedNumber);
      }

      return true;
    })
    .map((item) => {
      const splitAmount = splitTotalsByBetItemId[item.id] ?? 0;
      const remainingAmount = Math.max(0, toNumber(item.amount) - splitAmount);

      return {
        id: item.id,
        betType: item.betType,
        number: item.number,
        remainingAmount,
        createdAt: item.createdAt,
      };
    })
    .filter((item) => item.remainingAmount > 0)
    .sort((a, b) => {
      if (b.remainingAmount !== a.remainingAmount) {
        return b.remainingAmount - a.remainingAmount;
      }

      return b.createdAt.getTime() - a.createdAt.getTime();
    });

  const totalAvailable = matchedItems.reduce((sum, item) => sum + item.remainingAmount, 0);

  if (matchedItems.length === 0) {
    return { ok: false, error: "ไม่พบรายการที่สามารถแบ่งออกได้" };
  }

  if (requestedAmount > totalAvailable) {
    return { ok: false, error: "จำนวนเงินที่ต้องการแบ่งมากกว่ายอดคงเหลือของเลขนี้" };
  }

  let amountLeft = requestedAmount;
  const batchId = buildCode("SPL");
  const now = new Date();
  const creates: Array<{
    id: string;
    batchId: string;
    betItemId: string;
    drawId: string;
    betType: string;
    number: string;
    amount: number;
    createdById: string;
    note: string | null;
    updatedAt: Date;
  }> = [];

  for (const item of matchedItems) {
    if (amountLeft <= 0) {
      break;
    }

    const splitAmount = Math.min(item.remainingAmount, amountLeft);

    creates.push({
      id: crypto.randomUUID(),
      batchId,
      betItemId: item.id,
      drawId,
      betType: item.betType,
      number: item.number,
      amount: splitAmount,
      createdById: session.userId,
      note: note || null,
      updatedAt: now,
    });

    amountLeft -= splitAmount;
  }

  await prisma.$transaction(
    creates.map((data) => prisma.$executeRaw`
      INSERT INTO "BetItemSplit" (
        "id",
        "batchId",
        "betItemId",
        "drawId",
        "betType",
        "number",
        "amount",
        "createdById",
        "note",
        "updatedAt"
      ) VALUES (
        ${data.id},
        ${data.batchId},
        ${data.betItemId},
        ${data.drawId},
        ${data.betType}::"BetType",
        ${data.number},
        ${data.amount},
        ${data.createdById},
        ${data.note},
        ${data.updatedAt}
      )
    `),
  );

  revalidatePath("/dashboard/monitor");

  return {
    ok: true,
    batchId,
    splitTotal: requestedAmount - amountLeft,
    message: "บันทึกการแบ่งออกเรียบร้อย",
  };
}
