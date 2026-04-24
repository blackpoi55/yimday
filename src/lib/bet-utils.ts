import { BetItem, BetRate, BetType, type PayoutProfile, Role } from "@prisma/client";
import { betTypeDigits, betTypeLabels } from "@/lib/constants";
import { buildPricingMaps, getLinePricing } from "@/lib/ticket-pricing";
import { normalizeTicketDisplayType } from "@/lib/ticket-line";
import { toNumber } from "@/lib/utils";
import type { LegacyDisplayType } from "@/lib/php-ticket-parser";
import type { UserCompatSettings } from "@/lib/php-compat-shared";

export type TicketLineInput = {
  betType: BetType;
  displayType?: LegacyDisplayType;
  number: string;
  amount: number;
};

type RateLike = Pick<BetRate, "betType" | "payout" | "commission" | "isOpen" | "limitPerNumber">;
type PayoutLike = {
  role: Role;
  betType: BetType;
  payout?: number | PayoutProfile["payout"];
  commission: number | PayoutProfile["commission"];
};

export function normalizeNumber(value: string, betType: BetType) {
  const digits = value.replace(/\D/g, "");
  const expected = betTypeDigits[betType];
  return digits.slice(0, expected);
}

export function validateLine(line: TicketLineInput) {
  const expectedDigits = betTypeDigits[line.betType];

  if (normalizeNumber(line.number, line.betType).length !== expectedDigits) {
    return `เลข ${betTypeLabels[line.betType]} ต้องมี ${expectedDigits} หลัก`;
  }

  if (!Number.isFinite(line.amount) || line.amount <= 0) {
    return "จำนวนเงินต้องมากกว่า 0";
  }

  return null;
}

export function buildRateMap(rates: RateLike[]) {
  return Object.fromEntries(
    rates.map((rate) => [
      rate.betType,
      {
        payout: toNumber(rate.payout),
        commission: toNumber(rate.commission),
        isOpen: rate.isOpen,
        limitPerNumber: rate.limitPerNumber ? toNumber(rate.limitPerNumber) : null,
      },
    ]),
  ) as Record<
    BetType,
    {
      payout: number;
      commission: number;
      isOpen: boolean;
      limitPerNumber: number | null;
    }
  >;
}

export function calculateTicketTotals(
  lines: TicketLineInput[],
  rates: RateLike[],
  payoutProfiles: PayoutLike[] = [],
  role: Role = Role.CUSTOMER,
  userSettings?: Partial<UserCompatSettings>,
) {
  const rateMap = buildRateMap(rates);
  const pricingMaps = buildPricingMaps(rates, payoutProfiles, role, userSettings);

  let subtotal = 0;
  let discount = 0;

  for (const line of lines) {
    const rate = rateMap[line.betType];

    if (!rate) {
      throw new Error(`ไม่พบอัตราจ่ายของ ${betTypeLabels[line.betType]}`);
    }

    const { commission } = getLinePricing(line, pricingMaps, rate);
    subtotal += line.amount;
    discount += (line.amount * commission) / 100;
  }

  return {
    subtotal,
    discount,
    total: subtotal - discount,
  };
}

function sortDigits(value: string) {
  return value.split("").sort().join("");
}

type DrawResultLike = {
  top3: string;
  top2?: string | null;
  bottom2: string;
  bottom3?: string | null;
  front3?: string | null;
  front3Second?: string | null;
  back3?: string | null;
  back3Second?: string | null;
};

export function evaluateBet(
  item: Pick<BetItem, "betType" | "displayType" | "number"> | TicketLineInput,
  result: DrawResultLike,
) {
  const top2 = result.top2 || result.top3.slice(-2);
  const bottom3 = result.bottom3 || result.bottom2;
  const displayType = normalizeTicketDisplayType(item.betType, item.displayType);
  let isWinner = false;
  let hitLabel: string | null = null;

  switch (item.betType) {
    case BetType.TWO_TOP:
      if (displayType === "TWO_TOD") {
        isWinner = sortDigits(item.number) === sortDigits(top2);
        hitLabel = isWinner ? `2 โต๊ด ${top2}` : null;
      } else {
        isWinner = item.number === top2;
        hitLabel = isWinner ? `2 บน ${top2}` : null;
      }
      break;
    case BetType.TWO_BOTTOM:
      isWinner = item.number === result.bottom2;
      hitLabel = isWinner ? `2 ล่าง ${result.bottom2}` : null;
      break;
    case BetType.THREE_STRAIGHT:
      isWinner = item.number === result.top3;
      hitLabel = isWinner ? `3 บน ${result.top3}` : null;
      break;
    case BetType.THREE_TOD:
      isWinner = sortDigits(item.number) === sortDigits(result.top3);
      hitLabel = isWinner ? `3 โต๊ด ${result.top3}` : null;
      break;
    case BetType.THREE_BOTTOM:
      isWinner = !!result.bottom3 && item.number === result.bottom3;
      hitLabel = isWinner ? `3 ล่าง ${result.bottom3}` : null;
      break;
    case BetType.FRONT_THREE:
      isWinner = [result.front3, result.front3Second].filter(Boolean).includes(item.number);
      hitLabel = isWinner ? `3 หน้า ${item.number}` : null;
      break;
    case BetType.BACK_THREE:
      isWinner = [result.back3, result.back3Second].filter(Boolean).includes(item.number);
      hitLabel = isWinner ? `3 ท้าย ${item.number}` : null;
      break;
    case BetType.RUN_TOP:
      isWinner = result.top3.includes(item.number);
      hitLabel = isWinner ? `วิ่งบน ${item.number}` : null;
      break;
    case BetType.RUN_BOTTOM:
      isWinner = result.bottom2.includes(item.number) || bottom3.includes(item.number);
      hitLabel = isWinner ? `วิ่งล่าง ${item.number}` : null;
      break;
  }

  return { isWinner, hitLabel };
}
