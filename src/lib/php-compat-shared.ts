import { BetType, Role } from "@prisma/client";
import type { TicketPricingKey } from "@/lib/ticket-pricing";

export type UserCompatSettings = {
  pay_1: number;
  pay_2: number;
  pay_3: number;
  pay_4: number;
  pay_5: number;
  pay_6: number;
  pay_7: number;
  pay_8: number;
  discount_1: number;
  discount_2: number;
  discount_3: number;
  discount_4: number;
  discount_5: number;
  discount_6: number;
  discount_7: number;
  discount_8: number;
};

export const defaultUserCompatSettings: UserCompatSettings = {
  pay_1: 0,
  pay_2: 0,
  pay_3: 0,
  pay_4: 0,
  pay_5: 0,
  pay_6: 0,
  pay_7: 0,
  pay_8: 0,
  discount_1: 0,
  discount_2: 0,
  discount_3: 0,
  discount_4: 0,
  discount_5: 0,
  discount_6: 0,
  discount_7: 0,
  discount_8: 0,
};

type PayoutProfileLike = {
  betType: BetType;
  payout: number | string;
  commission: number | string;
};

export const compatUserSettingLabels = [
  { key: "pay_1", label: "3 บน ราคา" },
  { key: "discount_1", label: "3 บน ส่วนลด %" },
  { key: "pay_2", label: "3 โต๊ด ราคา" },
  { key: "discount_2", label: "3 โต๊ด ส่วนลด %" },
  { key: "pay_3", label: "2 บน ราคา" },
  { key: "discount_3", label: "2 บน ส่วนลด %" },
  { key: "pay_4", label: "คู่โต๊ด ราคา" },
  { key: "discount_4", label: "คู่โต๊ด ส่วนลด %" },
  { key: "pay_5", label: "วิ่งบน ราคา" },
  { key: "discount_5", label: "วิ่งบน ส่วนลด %" },
  { key: "pay_6", label: "3 ล่าง ราคา" },
  { key: "discount_6", label: "3 ล่าง ส่วนลด %" },
  { key: "pay_7", label: "2 ล่าง ราคา" },
  { key: "discount_7", label: "2 ล่าง ส่วนลด %" },
  { key: "pay_8", label: "วิ่งล่าง ราคา" },
  { key: "discount_8", label: "วิ่งล่าง ส่วนลด %" },
] as const;

export function compatSettingsToCommissionEntries(settings: UserCompatSettings, role: Role) {
  return [
    { role, betType: BetType.THREE_STRAIGHT, commission: settings.discount_1 },
    { role, betType: BetType.THREE_TOD, commission: settings.discount_2 },
    { role, betType: BetType.TWO_TOP, commission: settings.discount_3 },
    { role, betType: BetType.RUN_TOP, commission: settings.discount_5 },
    { role, betType: BetType.THREE_BOTTOM, commission: settings.discount_6 },
    { role, betType: BetType.TWO_BOTTOM, commission: settings.discount_7 },
    { role, betType: BetType.RUN_BOTTOM, commission: settings.discount_8 },
  ];
}

export function compatSettingsToPricingMap(settings: UserCompatSettings) {
  return new Map<TicketPricingKey, { payout: number; commission: number }>([
    [BetType.THREE_STRAIGHT, { payout: settings.pay_1, commission: settings.discount_1 }],
    [BetType.THREE_TOD, { payout: settings.pay_2, commission: settings.discount_2 }],
    [BetType.TWO_TOP, { payout: settings.pay_3, commission: settings.discount_3 }],
    ["TWO_TOD", { payout: settings.pay_4, commission: settings.discount_4 }],
    [BetType.RUN_TOP, { payout: settings.pay_5, commission: settings.discount_5 }],
    [BetType.THREE_BOTTOM, { payout: settings.pay_6, commission: settings.discount_6 }],
    [BetType.TWO_BOTTOM, { payout: settings.pay_7, commission: settings.discount_7 }],
    [BetType.RUN_BOTTOM, { payout: settings.pay_8, commission: settings.discount_8 }],
  ]);
}

function asNumber(value: number | string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function compatSettingsFromPayoutProfiles(profiles: PayoutProfileLike[]): UserCompatSettings {
  const map = new Map(profiles.map((profile) => [profile.betType, profile]));

  return {
    pay_1: asNumber(map.get(BetType.THREE_STRAIGHT)?.payout ?? 0),
    discount_1: asNumber(map.get(BetType.THREE_STRAIGHT)?.commission ?? 0),
    pay_2: asNumber(map.get(BetType.THREE_TOD)?.payout ?? 0),
    discount_2: asNumber(map.get(BetType.THREE_TOD)?.commission ?? 0),
    pay_3: asNumber(map.get(BetType.TWO_TOP)?.payout ?? 0),
    discount_3: asNumber(map.get(BetType.TWO_TOP)?.commission ?? 0),
    pay_4: asNumber(map.get(BetType.FRONT_THREE)?.payout ?? 0),
    discount_4: asNumber(map.get(BetType.FRONT_THREE)?.commission ?? 0),
    pay_5: asNumber(map.get(BetType.RUN_TOP)?.payout ?? 0),
    discount_5: asNumber(map.get(BetType.RUN_TOP)?.commission ?? 0),
    pay_6: asNumber(map.get(BetType.THREE_BOTTOM)?.payout ?? 0),
    discount_6: asNumber(map.get(BetType.THREE_BOTTOM)?.commission ?? 0),
    pay_7: asNumber(map.get(BetType.TWO_BOTTOM)?.payout ?? 0),
    discount_7: asNumber(map.get(BetType.TWO_BOTTOM)?.commission ?? 0),
    pay_8: asNumber(map.get(BetType.RUN_BOTTOM)?.payout ?? 0),
    discount_8: asNumber(map.get(BetType.RUN_BOTTOM)?.commission ?? 0),
  };
}
