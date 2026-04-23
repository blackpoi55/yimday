import { BetType, Role } from "@prisma/client";

export const roleLabels: Record<Role, string> = {
  ADMIN: "ผู้ดูแลระบบ",
  AGENT: "พนักงาน",
  CUSTOMER: "ลูกค้า",
};

export const betTypeOrder: BetType[] = [
  BetType.TWO_TOP,
  BetType.TWO_BOTTOM,
  BetType.THREE_STRAIGHT,
  BetType.THREE_TOD,
  BetType.THREE_BOTTOM,
  BetType.FRONT_THREE,
  BetType.BACK_THREE,
  BetType.RUN_TOP,
  BetType.RUN_BOTTOM,
];

export const betTypeLabels: Record<BetType, string> = {
  TWO_TOP: "2 ตัวบน",
  TWO_BOTTOM: "2 ตัวล่าง",
  THREE_STRAIGHT: "3 ตัวบน",
  THREE_TOD: "3 โต๊ด",
  THREE_BOTTOM: "3 ตัวล่าง",
  FRONT_THREE: "3 ตัวหน้า",
  BACK_THREE: "3 ตัวท้าย",
  RUN_TOP: "วิ่งบน",
  RUN_BOTTOM: "วิ่งล่าง",
};

export const betTypeDigits: Record<BetType, number> = {
  TWO_TOP: 2,
  TWO_BOTTOM: 2,
  THREE_STRAIGHT: 3,
  THREE_TOD: 3,
  THREE_BOTTOM: 3,
  FRONT_THREE: 3,
  BACK_THREE: 3,
  RUN_TOP: 1,
  RUN_BOTTOM: 1,
};

export const defaultBetRates = [
  { betType: BetType.TWO_TOP, payout: 90, commission: 10 },
  { betType: BetType.TWO_BOTTOM, payout: 90, commission: 10 },
  { betType: BetType.THREE_STRAIGHT, payout: 900, commission: 5 },
  { betType: BetType.THREE_TOD, payout: 150, commission: 5 },
  { betType: BetType.THREE_BOTTOM, payout: 150, commission: 5 },
  { betType: BetType.FRONT_THREE, payout: 450, commission: 5 },
  { betType: BetType.BACK_THREE, payout: 450, commission: 5 },
  { betType: BetType.RUN_TOP, payout: 3.2, commission: 0 },
  { betType: BetType.RUN_BOTTOM, payout: 4, commission: 0 },
];

export const payoutPageRows = [
  { betType: BetType.THREE_STRAIGHT, label: "3 บน" },
  { betType: BetType.THREE_TOD, label: "3 โต๊ด" },
  { betType: BetType.TWO_TOP, label: "2 บน" },
  { betType: BetType.FRONT_THREE, label: "คู่โต๊ด" },
  { betType: BetType.RUN_TOP, label: "วิ่งบน" },
  { betType: BetType.THREE_BOTTOM, label: "3 ล่าง" },
  { betType: BetType.TWO_BOTTOM, label: "2 ล่าง" },
  { betType: BetType.RUN_BOTTOM, label: "วิ่งล่าง" },
] as const;

export const defaultPayoutProfiles = [
  { role: Role.CUSTOMER, betType: BetType.THREE_STRAIGHT, payout: 500, commission: 25 },
  { role: Role.CUSTOMER, betType: BetType.THREE_TOD, payout: 100, commission: 25 },
  { role: Role.CUSTOMER, betType: BetType.TWO_TOP, payout: 70, commission: 25 },
  { role: Role.CUSTOMER, betType: BetType.FRONT_THREE, payout: 70, commission: 25 },
  { role: Role.CUSTOMER, betType: BetType.RUN_TOP, payout: 3, commission: 10 },
  { role: Role.CUSTOMER, betType: BetType.THREE_BOTTOM, payout: 100, commission: 25 },
  { role: Role.CUSTOMER, betType: BetType.TWO_BOTTOM, payout: 70, commission: 25 },
  { role: Role.CUSTOMER, betType: BetType.RUN_BOTTOM, payout: 3, commission: 10 },
  { role: Role.AGENT, betType: BetType.THREE_STRAIGHT, payout: 550, commission: 30 },
  { role: Role.AGENT, betType: BetType.THREE_TOD, payout: 100, commission: 30 },
  { role: Role.AGENT, betType: BetType.TWO_TOP, payout: 65, commission: 30 },
  { role: Role.AGENT, betType: BetType.FRONT_THREE, payout: 10, commission: 30 },
  { role: Role.AGENT, betType: BetType.RUN_TOP, payout: 3, commission: 10 },
  { role: Role.AGENT, betType: BetType.THREE_BOTTOM, payout: 100, commission: 30 },
  { role: Role.AGENT, betType: BetType.TWO_BOTTOM, payout: 65, commission: 30 },
  { role: Role.AGENT, betType: BetType.RUN_BOTTOM, payout: 4, commission: 10 },
];

export const navigationItems = [
  { href: "/dashboard", label: "หน้าหลัก", roles: [Role.ADMIN, Role.AGENT, Role.CUSTOMER] },
  { href: "/dashboard/draws", label: "เปิดงวด", roles: [Role.ADMIN] },
  { href: "/dashboard/results", label: "ปิดงวด", roles: [Role.ADMIN] },
  { href: "/dashboard/tickets", label: "ดูโพย", roles: [Role.ADMIN, Role.AGENT, Role.CUSTOMER] },
  { href: "/dashboard/realtime", label: "เรียลไทม์", roles: [Role.ADMIN] },
  { href: "/dashboard/limits", label: "เลขอั้น/เต็ม", roles: [Role.ADMIN] },
  { href: "/dashboard/users", label: "สมาชิก", roles: [Role.ADMIN, Role.AGENT] },
  { href: "/dashboard/payouts", label: "ส่วนลด", roles: [Role.ADMIN] },
  { href: "/dashboard/tickets/new", label: "คีย์โพย", roles: [Role.ADMIN, Role.AGENT, Role.CUSTOMER] },
];
