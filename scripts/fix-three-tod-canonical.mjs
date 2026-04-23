import "dotenv/config";
import { prisma } from "../src/lib/prisma.ts";

function sortDigits(value) {
  return value.split("").sort().join("");
}

async function main() {
  const rows = await prisma.betItem.findMany({
    where: { betType: "THREE_TOD" },
    select: { id: true, number: true },
  });

  const updates = rows
    .map((row) => ({
      id: row.id,
      from: row.number,
      to: sortDigits(row.number),
    }))
    .filter((row) => row.from !== row.to);

  if (updates.length === 0) {
    console.log("No THREE_TOD rows need canonical updates.");
    return;
  }

  await prisma.$transaction(
    updates.map((row) =>
      prisma.betItem.update({
        where: { id: row.id },
        data: { number: row.to },
      }),
    ),
  );

  const summary = updates.reduce((acc, row) => {
    const key = `${row.from}->${row.to}`;
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  console.log(
    JSON.stringify(
      {
        updated: updates.length,
        summary,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
