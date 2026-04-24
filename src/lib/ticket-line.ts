import { BetType } from "@prisma/client";

export type TicketDisplayType = BetType | "TWO_TOD";

export const ticketDisplayTypeLabels: Record<TicketDisplayType, string> = {
  TWO_TOP: "2 ตัวบน",
  TWO_BOTTOM: "2 ตัวล่าง",
  THREE_STRAIGHT: "3 ตัวบน",
  THREE_TOD: "3 โต๊ด",
  THREE_BOTTOM: "3 ตัวล่าง",
  FRONT_THREE: "3 ตัวหน้า",
  BACK_THREE: "3 ตัวท้าย",
  RUN_TOP: "วิ่งบน",
  RUN_BOTTOM: "วิ่งล่าง",
  TWO_TOD: "คู่โต๊ด",
};

export function normalizeTicketDisplayType(
  betType: BetType,
  displayType?: string | null,
): TicketDisplayType {
  return displayType === "TWO_TOD" ? "TWO_TOD" : betType;
}

export function getTicketLineLabel(betType: BetType, displayType?: string | null) {
  return ticketDisplayTypeLabels[normalizeTicketDisplayType(betType, displayType)];
}

export function isTwoTodDisplayType(displayType?: string | null) {
  return displayType === "TWO_TOD";
}
