import { Role, type BetRate, type BetType, type PayoutProfile } from "@prisma/client";
import { defaultPayoutProfiles } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/utils";

type PayoutLike = {
  role: Role;
  betType: BetType;
  payout?: number | PayoutProfile["payout"];
  commission: number | PayoutProfile["commission"];
};

type RateLike = Pick<BetRate, "betType" | "commission">;
type PayoutProfileRow = {
  id: string;
  role: Role;
  betType: BetType;
  payout: number | string;
  commission: number | string;
  createdById: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export async function hasPayoutProfileTable() {
  try {
    const result = await prisma.$queryRaw<Array<{ exists: boolean }>>`
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'PayoutProfile'
      ) AS "exists"
    `;

    return result[0]?.exists ?? false;
  } catch {
    return false;
  }
}

export async function ensurePayoutProfiles(userId?: string) {
  const hasTable = await hasPayoutProfileTable();

  if (!hasTable) {
    return;
  }

  const now = new Date();
  const existingProfiles = await prisma.$queryRaw<PayoutProfileRow[]>`
    SELECT
      id,
      role,
      "betType",
      payout,
      commission,
      "createdById",
      "createdAt",
      "updatedAt"
    FROM "PayoutProfile"
  `;
  const existingMap = new Map(existingProfiles.map((profile) => [`${profile.role}:${profile.betType}`, profile]));

  for (const item of defaultPayoutProfiles) {
    const key = `${item.role}:${item.betType}`;
    const current = existingMap.get(key);

    if (!current) {
      await prisma.$executeRaw`
        INSERT INTO "PayoutProfile" (
          id,
          role,
          "betType",
          payout,
          commission,
          "createdById",
          "createdAt",
          "updatedAt"
        )
        VALUES (
          ${crypto.randomUUID()},
          ${item.role}::"Role",
          ${item.betType}::"BetType",
          ${item.payout},
          ${item.commission},
          ${userId ?? null},
          ${now},
          ${now}
        )
      `;
      continue;
    }

    if (toNumber(current.payout) === 0 && toNumber(item.payout) > 0) {
      await prisma.$executeRaw`
        UPDATE "PayoutProfile"
        SET payout = ${item.payout},
            "updatedAt" = ${now}
        WHERE id = ${current.id}
      `;
    }
  }
}

export async function getPayoutProfiles(role?: Role) {
  const hasTable = await hasPayoutProfileTable();

  if (!hasTable) {
    return defaultPayoutProfiles.filter((item) => !role || item.role === role);
  }

  await ensurePayoutProfiles();

  if (role) {
    return prisma.$queryRaw<PayoutProfileRow[]>`
      SELECT
        id,
        role,
        "betType",
        payout,
        commission,
        "createdById",
        "createdAt",
        "updatedAt"
      FROM "PayoutProfile"
      WHERE role = ${role}::"Role"
      ORDER BY role ASC, "betType" ASC
    `;
  }

  return prisma.$queryRaw<PayoutProfileRow[]>`
    SELECT
      id,
      role,
      "betType",
      payout,
      commission,
      "createdById",
      "createdAt",
      "updatedAt"
    FROM "PayoutProfile"
    ORDER BY role ASC, "betType" ASC
  `;
}

export function buildCommissionMap(payouts: PayoutLike[], rates: RateLike[], role: Role) {
  const map = new Map<BetType, number>();

  for (const rate of rates) {
    map.set(rate.betType, toNumber(rate.commission));
  }

  for (const payout of payouts) {
    if (payout.role === role) {
      map.set(payout.betType, toNumber(payout.commission));
    }
  }

  return map;
}
