import { promises as fs } from "node:fs";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { defaultUserCompatSettings, type UserCompatSettings } from "@/lib/php-compat-shared";

type CompatStore = {
  userSettings: Record<string, UserCompatSettings>;
  blockedNumbers: {
    twoTop: string[];
    twoBottom: string[];
    threeTop: string[];
    threeBottom: string[];
  };
};

const defaultStore: CompatStore = {
  userSettings: {},
  blockedNumbers: {
    twoTop: [],
    twoBottom: [],
    threeTop: [],
    threeBottom: [],
  },
};

const storePath = path.join(process.cwd(), "data", "php-compat.json");

async function ensureStore() {
  await fs.mkdir(path.dirname(storePath), { recursive: true });

  try {
    await fs.access(storePath);
  } catch {
    await fs.writeFile(storePath, JSON.stringify(defaultStore, null, 2), "utf8");
  }
}

async function readStore(): Promise<CompatStore> {
  await ensureStore();
  const raw = await fs.readFile(storePath, "utf8");

  try {
    const parsed = JSON.parse(raw) as Partial<CompatStore>;
    return {
      userSettings: parsed.userSettings ?? {},
      blockedNumbers: {
        twoTop: parsed.blockedNumbers?.twoTop ?? [],
        twoBottom: parsed.blockedNumbers?.twoBottom ?? [],
        threeTop: parsed.blockedNumbers?.threeTop ?? [],
        threeBottom: parsed.blockedNumbers?.threeBottom ?? [],
      },
    };
  } catch {
    return defaultStore;
  }
}

async function writeStore(store: CompatStore) {
  await ensureStore();
  await fs.writeFile(storePath, JSON.stringify(store, null, 2), "utf8");
}

function normalizeSettings(input: Partial<UserCompatSettings> | undefined): UserCompatSettings {
  return {
    ...defaultUserCompatSettings,
    ...input,
  };
}

export async function getUserCompatSettings(userId: string, fallbackSettings?: Partial<UserCompatSettings>) {
  try {
    const rows = await prisma.userBetSetting.findMany({
      where: { userId },
    });

    if (rows.length > 0) {
      return normalizeSettings(
        Object.fromEntries(rows.map((row) => [row.settingKey, Number(row.value)])),
      );
    }
  } catch {
    // Fallback to file store below.
  }

  const store = await readStore();
  return normalizeSettings(store.userSettings[userId] ?? fallbackSettings);
}

export async function saveUserCompatSettings(userId: string, settings: Partial<UserCompatSettings>) {
  try {
    const now = new Date();
    await Promise.all(
      Object.entries(normalizeSettings(settings)).map(([settingKey, value]) =>
        prisma.userBetSetting.upsert({
          where: {
            userId_settingKey: {
              userId,
              settingKey,
            },
          },
          create: {
            id: crypto.randomUUID(),
            userId,
            settingKey,
            value,
            updatedAt: now,
          },
          update: {
            value,
            updatedAt: now,
          },
        }),
      ),
    );
    return;
  } catch {
    // Fallback to file store below.
  }

  const store = await readStore();
  store.userSettings[userId] = normalizeSettings({
    ...store.userSettings[userId],
    ...settings,
  });
  await writeStore(store);
}

export async function getBlockedNumbers() {
  try {
    const rows = await prisma.blockedNumber.findMany({
      where: { isBlocked: true },
    });

    return {
      twoTop: rows.filter((row) => row.groupKey === "twoTop").map((row) => row.number),
      twoBottom: rows.filter((row) => row.groupKey === "twoBottom").map((row) => row.number),
      threeTop: rows.filter((row) => row.groupKey === "threeTop").map((row) => row.number),
      threeBottom: rows.filter((row) => row.groupKey === "threeBottom").map((row) => row.number),
    };
  } catch {
    // Fallback to file store below.
  }

  const store = await readStore();
  return store.blockedNumbers;
}

export async function setBlockedNumbers(type: keyof CompatStore["blockedNumbers"], numbers: string[]) {
  try {
    await prisma.blockedNumber.deleteMany({
      where: { groupKey: type },
    });

    const uniqueNumbers = [...new Set(numbers)].sort();
    if (uniqueNumbers.length > 0) {
      await prisma.blockedNumber.createMany({
        data: uniqueNumbers.map((number) => ({
          id: crypto.randomUUID(),
          groupKey: type,
          number,
          isBlocked: true,
          updatedAt: new Date(),
        })),
      });
    }
    return;
  } catch {
    // Fallback to file store below.
  }

  const store = await readStore();
  store.blockedNumbers[type] = [...new Set(numbers)].sort();
  await writeStore(store);
}

export async function toggleBlockedNumber(type: keyof CompatStore["blockedNumbers"], number: string) {
  try {
    const existing = await prisma.blockedNumber.findFirst({
      where: {
        groupKey: type,
        number,
      },
    });

    if (existing) {
      await prisma.blockedNumber.delete({
        where: { id: existing.id },
      });
    } else {
      await prisma.blockedNumber.create({
        data: {
          id: crypto.randomUUID(),
          groupKey: type,
          number,
          isBlocked: true,
          updatedAt: new Date(),
        },
      });
    }
    return;
  } catch {
    // Fallback to file store below.
  }

  const store = await readStore();
  const next = new Set(store.blockedNumbers[type]);

  if (next.has(number)) {
    next.delete(number);
  } else {
    next.add(number);
  }

  store.blockedNumbers[type] = [...next].sort();
  await writeStore(store);
}
