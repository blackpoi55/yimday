"use server";

import { BetType, Role } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import { toggleBlockedNumber } from "@/lib/php-compat-store";
import { prisma } from "@/lib/prisma";

export async function updateBlockedNumberAction(formData: FormData) {
  await requireSession([Role.ADMIN]);

  const type = String(formData.get("type") ?? "") as "twoTop" | "twoBottom" | "threeTop" | "threeBottom";
  const number = String(formData.get("number") ?? "");

  if (!type || !number) {
    return;
  }

  await toggleBlockedNumber(type, number);
  revalidatePath("/dashboard/limits");
  revalidatePath("/dashboard/tickets/new");
}

export async function addBlockedThreeNumberAction(formData: FormData) {
  await requireSession([Role.ADMIN]);

  const type = String(formData.get("type") ?? "") as "threeTop" | "threeBottom";
  const number = String(formData.get("number") ?? "").replace(/\D/g, "").slice(0, 3);

  if (!type || number.length !== 3) {
    return;
  }

  await toggleBlockedNumber(type, number);
  revalidatePath("/dashboard/limits");
  revalidatePath("/dashboard/tickets/new");
}

export async function updateDrawLimitAction(formData: FormData) {
  await requireSession([Role.ADMIN]);

  const drawId = String(formData.get("drawId") ?? "");
  const mapping = [
    { field: "limit2on", betType: BetType.TWO_TOP },
    { field: "limit2below", betType: BetType.TWO_BOTTOM },
    { field: "limit3on", betType: BetType.THREE_STRAIGHT },
    { field: "limit3below", betType: BetType.THREE_BOTTOM },
    { field: "limit3tod", betType: BetType.THREE_TOD },
  ];

  if (!drawId) {
    return;
  }

  await Promise.all(
    mapping.map(({ field, betType }) =>
      prisma.betRate.updateMany({
        where: { drawId, betType },
        data: {
          limitPerNumber: Number(formData.get(field) ?? 0) || null,
          updatedAt: new Date(),
        },
      }),
    ),
  );

  revalidatePath("/dashboard/limits");
  revalidatePath("/dashboard/monitor");
  revalidatePath("/dashboard/tickets/new");
}
