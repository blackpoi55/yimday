/* eslint-disable @typescript-eslint/no-require-imports */
require("dotenv").config();
const bcrypt = require("bcryptjs");
const { PrismaPg } = require("@prisma/adapter-pg");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  const users = await prisma.user.findMany({
    where: {
      OR: [{ passwordPlain: null }, { passwordPlain: "" }],
    },
    select: {
      id: true,
      username: true,
      passwordHash: true,
    },
  });

  let updated = 0;

  for (const user of users) {
    const is1234 = await bcrypt.compare("1234", user.passwordHash);

    if (!is1234) {
      continue;
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordPlain: "1234",
        updatedAt: new Date(),
      },
    });

    updated += 1;
  }

  console.log(JSON.stringify({ updated }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
