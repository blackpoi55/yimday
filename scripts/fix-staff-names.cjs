/* eslint-disable @typescript-eslint/no-require-imports */
require("dotenv").config();
const bcrypt = require("bcryptjs");
const { PrismaPg } = require("@prisma/adapter-pg");
const { PrismaClient, Role } = require("@prisma/client");

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const staffRows = [
  { name: "กบ", username: "001", isActive: true },
  { name: "อุ๋ย", username: "002", isActive: true },
  { name: "เต้ย", username: "003", isActive: true },
  { name: "แก้ว", username: "004", isActive: false },
  { name: "เดียร์", username: "005", isActive: true },
  { name: "เปิ้ล", username: "006", isActive: false },
  { name: "จ่อย", username: "007", isActive: false },
  { name: "เซลล์", username: "008", isActive: true },
  { name: "trin", username: "009", isActive: false },
  { name: "ปิ้ม", username: "010", isActive: true },
  { name: "ณัฐ", username: "011", isActive: true },
];

function buildCode(prefix) {
  const now = new Date();
  const compact = `${now.getFullYear().toString().slice(-2)}${`${now.getMonth() + 1}`.padStart(2, "0")}${`${now.getDate()}`.padStart(2, "0")}${`${now.getHours()}`.padStart(2, "0")}${`${now.getMinutes()}`.padStart(2, "0")}${`${now.getSeconds()}`.padStart(2, "0")}`;
  const entropy = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${prefix}-${compact}-${entropy}`;
}

async function main() {
  const passwordHash = await bcrypt.hash("1234", 10);

  for (const row of staffRows) {
    const existing = await prisma.user.findUnique({
      where: { username: row.username },
      select: { id: true },
    });

    if (existing) {
      await prisma.user.update({
        where: { username: row.username },
        data: {
          name: row.name,
          role: Role.AGENT,
          ownerAgentId: null,
          passwordHash,
          passwordPlain: "1234",
          isActive: row.isActive,
          updatedAt: new Date(),
        },
      });
      continue;
    }

    await prisma.user.create({
      data: {
        id: crypto.randomUUID(),
        code: buildCode("AGT"),
        username: row.username,
        passwordHash,
        passwordPlain: "1234",
        name: row.name,
        role: Role.AGENT,
        isActive: row.isActive,
        ownerAgentId: null,
        updatedAt: new Date(),
      },
    });
  }

  const rows = await prisma.user.findMany({
    where: {
      role: Role.AGENT,
      username: { in: staffRows.map((row) => row.username) },
    },
    orderBy: { username: "asc" },
    select: {
      name: true,
      username: true,
      isActive: true,
    },
  });

  console.log(JSON.stringify(rows, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
