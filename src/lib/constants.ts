import { BetType, Role } from "@prisma/client";

export const roleLabels: Record<Role, string> = {
  ADMIN: "ผู้ดูแลระบบ",
  AGENT: "พนักงาน",
  CUSTOMER: "ลูกค้า",
};

export const roleNavLabels: Record<Role, string> = {
  ADMIN: "Admin",
  AGENT: "พนักงาน",
  CUSTOMER: "สมาชิก",
};

export const roleNavThemes: Record<
  Role,
  {
    primary: string;
    secondary: string;
    border: string;
    iconText: string;
    navSurface: string;
    logoutSurface: string;
    shadow: string;
  }
> = {
  ADMIN: {
    primary: "#155eef",
    secondary: "#0a49bb",
    border: "#1148b8",
    iconText: "#155eef",
    navSurface: "rgba(13, 75, 194, 0.55)",
    logoutSurface: "rgba(10, 67, 168, 0.7)",
    shadow: "0 18px 45px rgba(21,94,239,0.18)",
  },
  AGENT: {
    primary: "#0f766e",
    secondary: "#115e59",
    border: "#0f5b56",
    iconText: "#0f766e",
    navSurface: "rgba(10, 94, 88, 0.56)",
    logoutSurface: "rgba(15, 91, 86, 0.76)",
    shadow: "0 18px 45px rgba(15,118,110,0.20)",
  },
  CUSTOMER: {
    primary: "#b45309",
    secondary: "#92400e",
    border: "#9a5a13",
    iconText: "#b45309",
    navSurface: "rgba(146, 64, 14, 0.52)",
    logoutSurface: "rgba(120, 53, 15, 0.74)",
    shadow: "0 18px 45px rgba(180,83,9,0.20)",
  },
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
  { href: "/dashboard", label: "หน้าหลัก", roles: [Role.ADMIN] },
  { href: "/dashboard/draws", label: "เปิดงวด", roles: [Role.ADMIN] },
  { href: "/dashboard/results", label: "ปิดงวด", roles: [Role.ADMIN] },
  { href: "/dashboard/winners", label: "ตรวจหวย", roles: [Role.ADMIN, Role.AGENT] },
  { href: "/dashboard/tickets", label: "ดูโพย", roles: [Role.ADMIN, Role.AGENT, Role.CUSTOMER] },
  { href: "/dashboard/realtime", label: "เรียลไทม์", roles: [Role.ADMIN] },
  { href: "/dashboard/limits", label: "เลขอั้น/เต็ม", roles: [Role.ADMIN] },
  { href: "/dashboard/users", label: "สมาชิก", roles: [Role.ADMIN, Role.AGENT] },
  { href: "/dashboard/tickets/new", label: "คีย์โพย", roles: [Role.ADMIN, Role.AGENT, Role.CUSTOMER] },
];
