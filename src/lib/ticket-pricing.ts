import { BetRate, BetType, type PayoutProfile, Role } from "@prisma/client";
import { defaultUserCompatSettings, type UserCompatSettings } from "@/lib/php-compat-shared";
import { isTwoTodDisplayType, normalizeTicketDisplayType, type TicketDisplayType } from "@/lib/ticket-line";
import { toNumber } from "@/lib/utils";

export type TicketPricingKey = TicketDisplayType;

type RateLike = {
  betType: BetType;
  payout: number | BetRate["payout"];
  commission: number | BetRate["commission"];
};
type PayoutLike = {
  role: Role;
  betType: BetType;
  payout?: number | PayoutProfile["payout"];
  commission: number | PayoutProfile["commission"];
};

type PricingLineLike = {
  betType: BetType;
  displayType?: string | null;
};

export function getTicketPricingKey(line: PricingLineLike): TicketPricingKey {
  return normalizeTicketDisplayType(line.betType, line.displayType);
}

export function buildPricingMaps(
  rates: RateLike[],
  payoutProfiles: PayoutLike[] = [],
  role: Role = Role.CUSTOMER,
  userSettings?: Partial<UserCompatSettings>,
) {
  const payoutMap = new Map<TicketPricingKey, number>();
  const commissionMap = new Map<TicketPricingKey, number>();

  for (const rate of rates) {
    payoutMap.set(rate.betType, toNumber(rate.payout));
    commissionMap.set(rate.betType, toNumber(rate.commission));
  }

  const legacyTwoTodProfile = payoutProfiles.find(
    (payout) => payout.role === role && payout.betType === BetType.FRONT_THREE,
  );

  for (const payout of payoutProfiles) {
    if (payout.role !== role) {
      continue;
    }

    if (payout.betType === BetType.FRONT_THREE || payout.betType === BetType.BACK_THREE) {
      continue;
    }

    payoutMap.set(payout.betType, toNumber(payout.payout ?? 0));
    commissionMap.set(payout.betType, toNumber(payout.commission));
  }

  if (legacyTwoTodProfile) {
    payoutMap.set("TWO_TOD", toNumber(legacyTwoTodProfile.payout ?? 0));
    commissionMap.set("TWO_TOD", toNumber(legacyTwoTodProfile.commission));
  }

  if (userSettings) {
    const settings = {
      ...defaultUserCompatSettings,
      ...userSettings,
    };

    payoutMap.set(BetType.THREE_STRAIGHT, settings.pay_1);
    commissionMap.set(BetType.THREE_STRAIGHT, settings.discount_1);
    payoutMap.set(BetType.THREE_TOD, settings.pay_2);
    commissionMap.set(BetType.THREE_TOD, settings.discount_2);
    payoutMap.set(BetType.TWO_TOP, settings.pay_3);
    commissionMap.set(BetType.TWO_TOP, settings.discount_3);
    payoutMap.set("TWO_TOD", settings.pay_4);
    commissionMap.set("TWO_TOD", settings.discount_4);
    payoutMap.set(BetType.RUN_TOP, settings.pay_5);
    commissionMap.set(BetType.RUN_TOP, settings.discount_5);
    payoutMap.set(BetType.THREE_BOTTOM, settings.pay_6);
    commissionMap.set(BetType.THREE_BOTTOM, settings.discount_6);
    payoutMap.set(BetType.TWO_BOTTOM, settings.pay_7);
    commissionMap.set(BetType.TWO_BOTTOM, settings.discount_7);
    payoutMap.set(BetType.RUN_BOTTOM, settings.pay_8);
    commissionMap.set(BetType.RUN_BOTTOM, settings.discount_8);

    // Legacy data applies the member discount slot used for "คู่โต๊ด" to both 3หน้า and 3ท้าย.
    commissionMap.set(BetType.FRONT_THREE, settings.discount_4);
    commissionMap.set(BetType.BACK_THREE, settings.discount_4);
  }

  return {
    payoutMap,
    commissionMap,
  };
}

export function getLinePricing(
  line: PricingLineLike,
  maps: ReturnType<typeof buildPricingMaps>,
  fallbackRate?: { payout: number; commission: number } | null,
) {
  const key = getTicketPricingKey(line);

  return {
    key,
    payout:
      maps.payoutMap.get(key) ??
      (isTwoTodDisplayType(line.displayType) ? fallbackRate?.payout ?? 0 : fallbackRate?.payout ?? 0),
    commission:
      maps.commissionMap.get(key) ??
      (isTwoTodDisplayType(line.displayType) ? fallbackRate?.commission ?? 0 : fallbackRate?.commission ?? 0),
  };
}
