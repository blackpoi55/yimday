/* eslint-disable @typescript-eslint/no-require-imports */
require("dotenv").config();
const bcrypt = require("bcryptjs");
const { PrismaPg } = require("@prisma/adapter-pg");
const { PrismaClient, Role } = require("@prisma/client");

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const members = [
  { name: "มานะ มีดี", username: "mana", password: "12345", isActive: false },
  { name: "สมพงษ์ ไร้บ้าน", username: "sompong", password: "1234", isActive: false },
  { name: "นาย ก", username: "__blank__member_03", password: null, isActive: false },
  { name: "นาย ข", username: "__blank__member_04", password: null, isActive: false },
  { name: "กบ", username: "1", password: "1234", isActive: false },
  { name: "เกตุ อำนวย", username: "2", password: "1234", isActive: true },
  { name: "แก้วบิ้งพระ", username: "3", password: "1234", isActive: true },
  { name: "ขวัญ พล", username: "4", password: "1234", isActive: true },
  { name: "คิด", username: "5", password: "1234", isActive: true },
  { name: "เจ๊น้อย", username: "6", password: "1234", isActive: true },
  { name: "เจ๊หงส์", username: "7", password: "1234", isActive: true },
  { name: "เจิม", username: "8", password: "1234", isActive: true },
  { name: "เฉลียว", username: "9", password: "1234", isActive: true },
  { name: "เสื่อย", username: "10", password: "1234", isActive: true },
  { name: "ชบา", username: "11", password: "1234", isActive: true },
  { name: "ชุน", username: "12", password: "1234", isActive: true },
  { name: "เชื้อ", username: "13", password: "1234", isActive: true },
  { name: "เตี้ย", username: "14", password: "1234", isActive: true },
  { name: "ทัย", username: "15", password: "1234", isActive: true },
  { name: "นกแก้ว", username: "16", password: "1234", isActive: true },
  { name: "น้อยหญิง", username: "17", password: "1234", isActive: true },
  { name: "นา", username: "18", password: "1234", isActive: true },
  { name: "นายหนุ่ย", username: "19", password: "1234", isActive: true },
  { name: "นิตบัวงาม", username: "20", password: "1234", isActive: true },
  { name: "นิต-ตี๋", username: "21", password: "1234", isActive: true },
  { name: "นิ่ม", username: "22", password: "1234", isActive: true },
  { name: "บุชิ", username: "23", password: "1234", isActive: true },
  { name: "นุชาโลตัส", username: "24", password: "1234", isActive: true },
  { name: "บางระกำ", username: "25", password: "1234", isActive: true },
  { name: "บุ๋ม", username: "26", password: "1234", isActive: true },
  { name: "เบนซ์", username: "27", password: "1234", isActive: true },
  { name: "ป้าจืด", username: "28", password: "1234", isActive: true },
  { name: "ป้านอร์", username: "29", password: "1234", isActive: true },
  { name: "พัน", username: "30", password: "1234", isActive: true },
  { name: "ไพบุญย์", username: "31", password: "1234", isActive: true },
  { name: "มนตรี", username: "32", password: "1234", isActive: true },
  { name: "ลับแล", username: "33", password: "1234", isActive: true },
  { name: "ลุงชาติ", username: "34", password: "1234", isActive: true },
  { name: "ลุงดิ่ง", username: "35", password: "1234", isActive: true },
  { name: "ลุงเนิน", username: "36", password: "1234", isActive: true },
  { name: "ลูกน้ำ", username: "__display__36__luknam", password: "1234", isActive: true },
  { name: "ลูกสาวเนิน", username: "38", password: "1234", isActive: true },
  { name: "ส้ม", username: "39", password: "1234", isActive: true },
  { name: "สมัย", username: "40", password: "1234", isActive: true },
  { name: "หน่อย ต.", username: "41", password: "1234", isActive: true },
  { name: "หมวย", username: "42", password: "1234", isActive: true },
  { name: "หลอง", username: "43", password: "1234", isActive: true },
  { name: "อ้อ", username: "44", password: "1234", isActive: true },
  { name: "แอ๋ว สอต.", username: "45", password: "1234", isActive: true },
  { name: "ฮ๊ะ", username: "46", password: "1234", isActive: true },
  { name: "เสียไช้", username: "47", password: "1234", isActive: true },
  { name: "เสี่ยหนำ", username: "48", password: "1234", isActive: true },
  { name: "ปทุมวัน", username: "49", password: "1234", isActive: true },
  { name: "ตู่", username: "50", password: "1234", isActive: true },
  { name: "ฮั่ว", username: "51", password: "1234", isActive: true },
  { name: "อ้วน", username: "52", password: "1234", isActive: true },
  { name: "แท่ง", username: "53", password: "1234", isActive: true },
  { name: "พันแก้ว", username: "54", password: "1234", isActive: true },
  { name: "หมู ต", username: "55", password: "1234", isActive: true },
  { name: "ทดสอบ", username: "999", password: "999", isActive: false },
  { name: "โหม่ง", username: "56", password: "1234", isActive: true },
  { name: "trin", username: "0", password: "1234", isActive: false },
  { name: "นา เบ็นซ์", username: "__blank__member_63", password: null, isActive: true },
  { name: "นิ่ม", username: "__blank__member_64", password: null, isActive: false },
];

function buildCode(prefix) {
  const now = new Date();
  const compact = `${now.getFullYear().toString().slice(-2)}${`${now.getMonth() + 1}`.padStart(2, "0")}${`${now.getDate()}`.padStart(2, "0")}${`${now.getHours()}`.padStart(2, "0")}${`${now.getMinutes()}`.padStart(2, "0")}${`${now.getSeconds()}`.padStart(2, "0")}`;
  const entropy = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${prefix}-${compact}-${entropy}`;
}

async function passwordPair(password) {
  if (!password) {
    const generated = crypto.randomUUID();
    return {
      passwordPlain: null,
      passwordHash: await bcrypt.hash(generated, 10),
    };
  }

  return {
    passwordPlain: password,
    passwordHash: await bcrypt.hash(password, 10),
  };
}

async function main() {
  for (const member of members) {
    const { passwordHash, passwordPlain } = await passwordPair(member.password);
    const existing = await prisma.user.findUnique({
      where: { username: member.username },
      select: { id: true },
    });

    if (existing) {
      await prisma.user.update({
        where: { username: member.username },
        data: {
          name: member.name,
          role: Role.CUSTOMER,
          ownerAgentId: null,
          passwordHash,
          passwordPlain,
          isActive: member.isActive,
          updatedAt: new Date(),
        },
      });
      continue;
    }

    await prisma.user.create({
      data: {
        id: crypto.randomUUID(),
        code: buildCode("CUS"),
        username: member.username,
        passwordHash,
        passwordPlain,
        name: member.name,
        role: Role.CUSTOMER,
        isActive: member.isActive,
        ownerAgentId: null,
        updatedAt: new Date(),
      },
    });
  }

  const rows = await prisma.user.findMany({
    where: {
      role: Role.CUSTOMER,
      ownerAgentId: null,
      username: { in: members.map((member) => member.username) },
    },
    orderBy: { createdAt: "asc" },
    select: {
      name: true,
      username: true,
      passwordPlain: true,
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
