"use server";

import { Role } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import { hasPayoutProfileTable } from "@/lib/payouts";
import { prisma } from "@/lib/prisma";

export async function updatePayoutProfileAction(formData: FormData) {
  await requireSession([Role.ADMIN]);

  if (!(await hasPayoutProfileTable())) {
    return;
  }

  const id = String(formData.get("id") ?? "");
  const payout = Number(formData.get("payout") ?? 0);
  const commission = Number(formData.get("commission") ?? 0);

  if (!id) {
    return;
  }

  const updatedAt = new Date();

  await prisma.$executeRaw`
    UPDATE "PayoutProfile"
    SET payout = ${payout},
        commission = ${commission},
        "updatedAt" = ${updatedAt}
    WHERE id = ${id}
  `;

  revalidatePath("/dashboard/payouts");
}
