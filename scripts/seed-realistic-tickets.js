require("dotenv/config");

const { PrismaPg } = require("@prisma/adapter-pg");
const { PrismaClient, BetType, Role, TicketStatus } = require("@prisma/client");

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const SEED_TAG = "[seed-realistic-tickets-v2]";

const betTypeDigits = {
  [BetType.TWO_TOP]: 2,
  [BetType.TWO_BOTTOM]: 2,
  [BetType.THREE_STRAIGHT]: 3,
  [BetType.THREE_TOD]: 3,
  [BetType.THREE_BOTTOM]: 3,
  [BetType.FRONT_THREE]: 3,
  [BetType.BACK_THREE]: 3,
  [BetType.RUN_TOP]: 1,
  [BetType.RUN_BOTTOM]: 1,
};

const discountKeyByBetType = {
  [BetType.THREE_STRAIGHT]: "discount_1",
  [BetType.THREE_TOD]: "discount_2",
  [BetType.TWO_TOP]: "discount_3",
  [BetType.FRONT_THREE]: "discount_4",
  [BetType.RUN_TOP]: "discount_5",
  [BetType.THREE_BOTTOM]: "discount_6",
  [BetType.TWO_BOTTOM]: "discount_7",
  [BetType.RUN_BOTTOM]: "discount_8",
  [BetType.BACK_THREE]: "discount_4",
};

const openFocusNumbers = {
  [BetType.TWO_TOP]: ["12", "34", "45", "88", "23", "67", "71", "57", "24", "42", "75"],
  [BetType.TWO_BOTTOM]: ["64", "34", "19", "22", "46", "24", "11", "49", "04", "18"],
  [BetType.THREE_STRAIGHT]: ["123", "512", "999", "904", "486", "053", "472", "428", "824", "916"],
  [BetType.THREE_TOD]: ["321", "251", "887", "303", "752", "592", "978", "569", "672", "975"],
  [BetType.THREE_BOTTOM]: ["264", "777", "872", "916", "824", "486", "569"],
  [BetType.FRONT_THREE]: ["789", "334", "170", "120", "100", "050"],
  [BetType.BACK_THREE]: ["012", "264", "170", "120", "100", "500"],
  [BetType.RUN_TOP]: ["1", "2", "5", "7", "8", "9", "4"],
  [BetType.RUN_BOTTOM]: ["4", "6", "2", "8", "9", "1"],
};

const resultedFocusNumbers = {
  [BetType.TWO_TOP]: ["12", "78", "45", "34", "57", "24"],
  [BetType.TWO_BOTTOM]: ["64", "19", "34", "22", "18", "04"],
  [BetType.THREE_STRAIGHT]: ["512", "999", "264", "789", "123"],
  [BetType.THREE_TOD]: ["251", "125", "215", "321", "512"],
  [BetType.THREE_BOTTOM]: ["264", "777", "916", "824"],
  [BetType.FRONT_THREE]: ["789", "334", "512"],
  [BetType.BACK_THREE]: ["012", "264", "512"],
  [BetType.RUN_TOP]: ["1", "2", "5", "7", "8"],
  [BetType.RUN_BOTTOM]: ["4", "6", "2", "8", "9"],
};

const heavyPatterns = [
  {
    note: "กอง 2 บนหนัก",
    items: [
      { betType: BetType.TWO_TOP, number: "12", amount: 220 },
      { betType: BetType.TWO_TOP, number: "12", amount: 180 },
      { betType: BetType.TWO_TOP, number: "34", amount: 160 },
      { betType: BetType.TWO_TOP, number: "45", amount: 140 },
      { betType: BetType.RUN_TOP, number: "1", amount: 90 },
      { betType: BetType.RUN_TOP, number: "2", amount: 70 },
      { betType: BetType.THREE_STRAIGHT, number: "123", amount: 120 },
      { betType: BetType.THREE_TOD, number: "321", amount: 90 },
      { betType: BetType.FRONT_THREE, number: "789", amount: 70 },
      { betType: BetType.BACK_THREE, number: "012", amount: 70 },
    ],
  },
  {
    note: "กองล่างหนัก",
    items: [
      { betType: BetType.TWO_BOTTOM, number: "64", amount: 200 },
      { betType: BetType.TWO_BOTTOM, number: "64", amount: 150 },
      { betType: BetType.RUN_BOTTOM, number: "4", amount: 100 },
      { betType: BetType.RUN_BOTTOM, number: "6", amount: 90 },
      { betType: BetType.THREE_BOTTOM, number: "264", amount: 140 },
      { betType: BetType.THREE_BOTTOM, number: "777", amount: 100 },
      { betType: BetType.TWO_TOP, number: "23", amount: 90 },
      { betType: BetType.THREE_TOD, number: "251", amount: 80 },
      { betType: BetType.THREE_STRAIGHT, number: "512", amount: 70 },
      { betType: BetType.BACK_THREE, number: "012", amount: 60 },
    ],
  },
  {
    note: "โพยรวมทุกประเภท",
    items: [
      { betType: BetType.TWO_TOP, number: "12", amount: 100 },
      { betType: BetType.TWO_BOTTOM, number: "64", amount: 100 },
      { betType: BetType.THREE_STRAIGHT, number: "512", amount: 60 },
      { betType: BetType.THREE_TOD, number: "251", amount: 60 },
      { betType: BetType.THREE_BOTTOM, number: "264", amount: 60 },
      { betType: BetType.FRONT_THREE, number: "789", amount: 40 },
      { betType: BetType.BACK_THREE, number: "012", amount: 40 },
      { betType: BetType.RUN_TOP, number: "1", amount: 40 },
      { betType: BetType.RUN_BOTTOM, number: "4", amount: 40 },
      { betType: BetType.TWO_TOP, number: "34", amount: 80 },
      { betType: BetType.TWO_BOTTOM, number: "34", amount: 80 },
      { betType: BetType.THREE_STRAIGHT, number: "123", amount: 70 },
    ],
  },
  {
    note: "โพยเลขชุดยาว",
    items: [
      { betType: BetType.TWO_TOP, number: "71", amount: 50 },
      { betType: BetType.TWO_TOP, number: "57", amount: 50 },
      { betType: BetType.TWO_TOP, number: "24", amount: 50 },
      { betType: BetType.TWO_BOTTOM, number: "22", amount: 50 },
      { betType: BetType.TWO_BOTTOM, number: "46", amount: 50 },
      { betType: BetType.TWO_BOTTOM, number: "24", amount: 50 },
      { betType: BetType.THREE_STRAIGHT, number: "904", amount: 80 },
      { betType: BetType.THREE_STRAIGHT, number: "486", amount: 80 },
      { betType: BetType.THREE_TOD, number: "672", amount: 70 },
      { betType: BetType.THREE_TOD, number: "569", amount: 70 },
      { betType: BetType.RUN_TOP, number: "7", amount: 30 },
      { betType: BetType.RUN_BOTTOM, number: "4", amount: 30 },
      { betType: BetType.FRONT_THREE, number: "170", amount: 40 },
      { betType: BetType.BACK_THREE, number: "500", amount: 40 },
    ],
  },
];

function normalizeNumber(value, betType) {
  return String(value).replace(/\D/g, "").slice(0, betTypeDigits[betType]);
}

function buildCode(prefix) {
  const now = new Date();
  const compact = `${now.getFullYear().toString().slice(-2)}${`${now.getMonth() + 1}`.padStart(2, "0")}${`${now.getDate()}`.padStart(2, "0")}${`${now.getHours()}`.padStart(2, "0")}${`${now.getMinutes()}`.padStart(2, "0")}${`${now.getSeconds()}`.padStart(2, "0")}`;
  const entropy = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${prefix}-${compact}-${entropy}`;
}

function toNumber(value) {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value);
  if (typeof value === "bigint") return Number(value);
  if (value && typeof value === "object" && "toString" in value) return Number(value.toString());
  return 0;
}

function sortDigits(value) {
  return value.split("").sort().join("");
}

function evaluateBet(item, result) {
  const top2 = result.top2 || result.top3.slice(-2);
  const bottom3 = result.bottom3 || result.bottom2;
  let isWinner = false;
  let hitLabel = null;

  switch (item.betType) {
    case BetType.TWO_TOP:
      isWinner = item.number === top2;
      hitLabel = isWinner ? `2 บน ${top2}` : null;
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
      isWinner = !!result.front3 && item.number === result.front3;
      hitLabel = isWinner ? `3 หน้า ${result.front3}` : null;
      break;
    case BetType.BACK_THREE:
      isWinner = !!result.back3 && item.number === result.back3;
      hitLabel = isWinner ? `3 ท้าย ${result.back3}` : null;
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

function pick(list, index) {
  return list[index % list.length];
}

function minutesAgo(base, minutes) {
  return new Date(base.getTime() - minutes * 60_000);
}

async function getCustomerDiscountMap(customerIds) {
  const settings = await prisma.userBetSetting.findMany({
    where: {
      userId: { in: customerIds },
      settingKey: { in: Object.values(discountKeyByBetType) },
    },
  });

  const map = new Map();

  for (const row of settings) {
    if (!map.has(row.userId)) {
      map.set(row.userId, {});
    }

    map.get(row.userId)[row.settingKey] = toNumber(row.value);
  }

  return map;
}

function calculateTotals(lines, rateMap, customerDiscounts) {
  let subtotal = 0;
  let discount = 0;

  for (const line of lines) {
    subtotal += line.amount;
    const key = discountKeyByBetType[line.betType];
    const commission = customerDiscounts?.[key] ?? toNumber(rateMap.get(line.betType)?.commission ?? 0);
    discount += (line.amount * commission) / 100;
  }

  return { subtotal, discount, total: subtotal - discount };
}

function uniqueKey(item) {
  return `${item.betType}:${item.number}`;
}

function expandTicketItems(seedItems, focusPool, ticketIndex, minItems, targetItems) {
  const items = [];
  const seen = new Set();

  for (const item of seedItems) {
    const normalized = { ...item, number: normalizeNumber(item.number, item.betType) };
    items.push(normalized);
    seen.add(uniqueKey(normalized));
  }

  const typeRotation = [
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

  let cursor = 0;
  while (items.length < targetItems) {
    const betType = typeRotation[(ticketIndex + cursor) % typeRotation.length];
    const numberPool = focusPool[betType];
    const rawNumber = numberPool[(ticketIndex * 3 + cursor) % numberPool.length];
    const number = normalizeNumber(rawNumber, betType);
    const key = `${betType}:${number}`;
    const amountBase = betType === BetType.RUN_TOP || betType === BetType.RUN_BOTTOM ? 20 : betTypeDigits[betType] === 2 ? 50 : 70;
    const amount = amountBase + ((ticketIndex + cursor) % 6) * 10;

    if (!seen.has(key) || cursor % 5 === 0) {
      items.push({ betType, number, amount });
      seen.add(key);
    }

    cursor += 1;
  }

  return items.slice(0, Math.max(minItems, targetItems));
}

async function main() {
  const activeAgents = await prisma.user.findMany({
    where: { role: Role.AGENT, isActive: true },
    select: { id: true, name: true, username: true },
    orderBy: { createdAt: "asc" },
  });

  const customers = await prisma.user.findMany({
    where: { role: Role.CUSTOMER, isActive: true },
    select: { id: true, name: true, ownerAgentId: true, memberType: true },
    orderBy: { createdAt: "asc" },
  });

  const draws = await prisma.draw.findMany({
    include: { BetRate: true, DrawResult: true },
    orderBy: { drawDate: "asc" },
  });

  const openDraw = draws.find((draw) => draw.status === "OPEN");
  const resultedDraw = draws.find((draw) => draw.status === "RESULTED" && draw.DrawResult);

  if (!openDraw || !resultedDraw) {
    throw new Error("ต้องมีทั้งงวด OPEN และ RESULTED ก่อน seed ข้อมูล");
  }

  if (activeAgents.length === 0 || customers.length === 0) {
    throw new Error("ต้องมีพนักงาน active และลูกค้าในระบบก่อน seed ข้อมูล");
  }

  const oldSeedTickets = await prisma.ticket.findMany({
    where: {
      OR: [
        { note: { startsWith: "[seed-realistic-tickets-v1]" } },
        { note: { startsWith: SEED_TAG } },
      ],
    },
    select: { id: true },
  });

  if (oldSeedTickets.length > 0) {
    await prisma.ticket.deleteMany({
      where: {
        id: { in: oldSeedTickets.map((ticket) => ticket.id) },
      },
    });
  }

  const chosenCustomers = customers.slice(0, Math.min(customers.length, 24));
  const discountMap = await getCustomerDiscountMap(chosenCustomers.map((customer) => customer.id));
  const openRateMap = new Map(openDraw.BetRate.map((rate) => [rate.betType, rate]));
  const resultedRateMap = new Map(resultedDraw.BetRate.map((rate) => [rate.betType, rate]));
  const ticketsToCreate = [];
  const baseNow = new Date();

  const openTicketCount = 140;
  for (let i = 0; i < openTicketCount; i += 1) {
    const customer = pick(chosenCustomers, i);
    const agent = customer.ownerAgentId
      ? activeAgents.find((row) => row.id === customer.ownerAgentId) ?? pick(activeAgents, i)
      : pick(activeAgents, i);
    const pattern = pick(heavyPatterns, i);
    const targetItems = 8 + (i % 11);
    const expandedItems = expandTicketItems(pattern.items, openFocusNumbers, i, 8, targetItems);
    const createdAt = minutesAgo(baseNow, 8 * (i + 1));
    const lines = expandedItems.map((line, lineIndex) => ({
      id: crypto.randomUUID(),
      betType: line.betType,
      number: normalizeNumber(line.number, line.betType),
      amount: line.amount + ((i + lineIndex) % 5) * 5,
      payoutRate: toNumber(openRateMap.get(line.betType)?.payout ?? 0),
      isWinner: false,
      hitLabel: null,
      winAmount: 0,
      createdAt,
    }));

    const totals = calculateTotals(lines, openRateMap, discountMap.get(customer.id));

    ticketsToCreate.push({
      id: crypto.randomUUID(),
      code: buildCode("TKT"),
      customerId: customer.id,
      agentId: agent.id,
      drawId: openDraw.id,
      status: TicketStatus.CONFIRMED,
      note: `${SEED_TAG} OPEN ${pattern.note} #${i + 1}`,
      subtotal: totals.subtotal,
      discount: totals.discount,
      total: totals.total,
      winAmount: 0,
      createdAt,
      updatedAt: createdAt,
      settledAt: null,
      lines,
    });
  }

  const resultedTicketCount = 80;
  for (let i = 0; i < resultedTicketCount; i += 1) {
    const customer = pick(chosenCustomers, i + 7);
    const agent = customer.ownerAgentId
      ? activeAgents.find((row) => row.id === customer.ownerAgentId) ?? pick(activeAgents, i + 2)
      : pick(activeAgents, i + 2);
    const pattern = pick(heavyPatterns, i + 1);
    const targetItems = 7 + (i % 9);
    const expandedItems = expandTicketItems(pattern.items, resultedFocusNumbers, i + 20, 7, targetItems);
    const createdAt = new Date(resultedDraw.closeAt.getTime() - (i + 2) * 2_700_000);
    const lines = expandedItems.map((line) => {
      const normalized = normalizeNumber(line.number, line.betType);
      const payoutRate = toNumber(resultedRateMap.get(line.betType)?.payout ?? 0);
      const evaluation = evaluateBet({ betType: line.betType, number: normalized }, resultedDraw.DrawResult);
      const winAmount = evaluation.isWinner ? line.amount * payoutRate : 0;

      return {
        id: crypto.randomUUID(),
        betType: line.betType,
        number: normalized,
        amount: line.amount,
        payoutRate,
        isWinner: evaluation.isWinner,
        hitLabel: evaluation.hitLabel,
        winAmount,
        createdAt,
      };
    });

    const totals = calculateTotals(lines, resultedRateMap, discountMap.get(customer.id));
    const ticketWinAmount = lines.reduce((sum, line) => sum + line.winAmount, 0);

    ticketsToCreate.push({
      id: crypto.randomUUID(),
      code: buildCode("TKT"),
      customerId: customer.id,
      agentId: agent.id,
      drawId: resultedDraw.id,
      status: TicketStatus.CONFIRMED,
      note: `${SEED_TAG} RESULT ${pattern.note} #${i + 1}`,
      subtotal: totals.subtotal,
      discount: totals.discount,
      total: totals.total,
      winAmount: ticketWinAmount,
      createdAt,
      updatedAt: createdAt,
      settledAt: resultedDraw.closeAt,
      lines,
    });
  }

  for (const ticket of ticketsToCreate) {
    await prisma.ticket.create({
      data: {
        id: ticket.id,
        code: ticket.code,
        customerId: ticket.customerId,
        agentId: ticket.agentId,
        drawId: ticket.drawId,
        status: ticket.status,
        note: ticket.note,
        subtotal: ticket.subtotal,
        discount: ticket.discount,
        total: ticket.total,
        winAmount: ticket.winAmount,
        createdAt: ticket.createdAt,
        updatedAt: ticket.updatedAt,
        settledAt: ticket.settledAt,
        BetItem: {
          create: ticket.lines.map((line) => ({
            id: line.id,
            betType: line.betType,
            number: line.number,
            amount: line.amount,
            payoutRate: line.payoutRate,
            isWinner: line.isWinner,
            hitLabel: line.hitLabel,
            winAmount: line.winAmount,
            createdAt: line.createdAt,
          })),
        },
      },
    });
  }

  const seededTickets = await prisma.ticket.findMany({
    where: { note: { startsWith: SEED_TAG } },
    select: {
      id: true,
      drawId: true,
      _count: { select: { BetItem: true } },
    },
  });

  const itemCounts = seededTickets.map((ticket) => ticket._count.BetItem);
  const averageItemsPerTicket = itemCounts.reduce((sum, count) => sum + count, 0) / seededTickets.length;

  const openTotals = await prisma.betItem.groupBy({
    by: ["betType", "number"],
    where: {
      Ticket: { drawId: openDraw.id },
    },
    _sum: { amount: true },
    orderBy: { _sum: { amount: "desc" } },
    take: 12,
  });

  console.log(
    JSON.stringify(
      {
        deletedOldSeedTickets: oldSeedTickets.length,
        createdTickets: ticketsToCreate.length,
        createdOpenTickets: openTicketCount,
        createdResultedTickets: resultedTicketCount,
        averageItemsPerTicket,
        minItemsPerTicket: Math.min(...itemCounts),
        maxItemsPerTicket: Math.max(...itemCounts),
        openDraw: openDraw.name,
        resultedDraw: resultedDraw.name,
        topOpenNumbers: openTotals.map((row) => ({
          betType: row.betType,
          number: row.number,
          amount: toNumber(row._sum.amount),
        })),
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
