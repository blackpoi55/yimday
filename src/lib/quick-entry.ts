import { BetType } from "@prisma/client";
import { betTypeDigits } from "@/lib/constants";

export type QuickEntryMode = "TOP" | "BOTTOM" | "MIXED";

export type ParsedQuickLine = {
  betType: BetType;
  number: string;
  amount: number;
  source: string;
};

type ParseSuccess = {
  lines: ParsedQuickLine[];
};

type ParseError = {
  error: string;
};

function createLine(
  betType: BetType,
  number: string,
  amount: number,
  source: string,
): ParsedQuickLine {
  const normalized = number.replace(/\D/g, "").slice(0, betTypeDigits[betType]);
  return {
    betType,
    number: normalized,
    amount,
    source,
  };
}

function permutations(value: string) {
  return [...new Set(value.split("").reduce<string[]>((acc, digit, index, digits) => {
    if (digits.length === 1) {
      return [digit];
    }

    if (digits.length === 2) {
      return acc;
    }

    const remaining = [...digits.slice(0, index), ...digits.slice(index + 1)];
    const inner = remaining.length === 1
      ? [remaining[0]]
      : [...new Set(remaining.flatMap((innerDigit, innerIndex) => {
          const third = [...remaining.slice(0, innerIndex), ...remaining.slice(innerIndex + 1)][0];
          return `${innerDigit}${third}`;
        }))];
    return [...acc, ...inner.map((item) => `${digit}${item}`)];
  }, []))];
}

function nineteenTailNumbers(digit: string) {
  const values = new Set<string>();

  for (let i = 0; i <= 9; i += 1) {
    if (`${i}` !== digit) {
      values.add(`${digit}${i}`);
      values.add(`${i}${digit}`);
    }
  }

  return [...values];
}

function parseAmount(value: string) {
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0 ? amount : null;
}

function parseTopLine(rawLine: string): ParsedQuickLine[] | ParseError {
  const line = rawLine.replace(/\s+/g, "");

  const nineteenMatch = line.match(/^(\d)=19\*(\d+(?:\.\d+)?)$/);
  if (nineteenMatch) {
    const amount = parseAmount(nineteenMatch[2]);
    if (!amount) {
      return { error: `จำนวนเงินไม่ถูกต้อง: ${rawLine}` };
    }
    return nineteenTailNumbers(nineteenMatch[1]).map((number) =>
      createLine(BetType.TWO_TOP, number, amount, rawLine),
    );
  }

  const runMatch = line.match(/^(\d)=(\d+(?:\.\d+)?)$/);
  if (runMatch) {
    const amount = parseAmount(runMatch[2]);
    if (!amount) {
      return { error: `จำนวนเงินไม่ถูกต้อง: ${rawLine}` };
    }
    return [createLine(BetType.RUN_TOP, runMatch[1], amount, rawLine)];
  }

  const twoTopMatch = line.match(/^(\d{2})=(\d+(?:\.\d+)?)$/);
  if (twoTopMatch) {
    const amount = parseAmount(twoTopMatch[2]);
    if (!amount) {
      return { error: `จำนวนเงินไม่ถูกต้อง: ${rawLine}` };
    }
    return [createLine(BetType.TWO_TOP, twoTopMatch[1], amount, rawLine)];
  }

  const threeTodOnlyMatch = line.match(/^(\d{3})\*(\d+(?:\.\d+)?)$/);
  if (threeTodOnlyMatch) {
    const amount = parseAmount(threeTodOnlyMatch[2]);
    if (!amount) {
      return { error: `จำนวนเงินไม่ถูกต้อง: ${rawLine}` };
    }
    return [createLine(BetType.THREE_TOD, threeTodOnlyMatch[1], amount, rawLine)];
  }

  const threeStraightTodMatch = line.match(/^(\d{3})=(\d+(?:\.\d+)?)\*(\d+(?:\.\d+)?)$/);
  if (threeStraightTodMatch) {
    const straightAmount = parseAmount(threeStraightTodMatch[2]);
    const todAmount = parseAmount(threeStraightTodMatch[3]);
    if (!straightAmount || !todAmount) {
      return { error: `จำนวนเงินไม่ถูกต้อง: ${rawLine}` };
    }
    return [
      createLine(BetType.THREE_STRAIGHT, threeStraightTodMatch[1], straightAmount, rawLine),
      createLine(BetType.THREE_TOD, threeStraightTodMatch[1], todAmount, rawLine),
    ];
  }

  const permutationsMatch = line.match(/^(\d{3})\*=(\d+(?:\.\d+)?)$/);
  if (permutationsMatch) {
    const amount = parseAmount(permutationsMatch[2]);
    if (!amount) {
      return { error: `จำนวนเงินไม่ถูกต้อง: ${rawLine}` };
    }
    return permutations(permutationsMatch[1]).map((number) =>
      createLine(BetType.THREE_STRAIGHT, number, amount, rawLine),
    );
  }

  const threeStraightMatch = line.match(/^(\d{3})=(\d+(?:\.\d+)?)$/);
  if (threeStraightMatch) {
    const amount = parseAmount(threeStraightMatch[2]);
    if (!amount) {
      return { error: `จำนวนเงินไม่ถูกต้อง: ${rawLine}` };
    }
    return [createLine(BetType.THREE_STRAIGHT, threeStraightMatch[1], amount, rawLine)];
  }

  return {
    error:
      `รูปแบบคีย์บนไม่รองรับ: ${rawLine} เช่น 1=100, 12=100, 123=100, 123*50, 123=100*50, 123*=10, 5=19*10`,
  };
}

function parseBottomLine(rawLine: string): ParsedQuickLine[] | ParseError {
  const line = rawLine.replace(/\s+/g, "");

  const nineteenMatch = line.match(/^(\d)=19\*(\d+(?:\.\d+)?)$/);
  if (nineteenMatch) {
    const amount = parseAmount(nineteenMatch[2]);
    if (!amount) {
      return { error: `จำนวนเงินไม่ถูกต้อง: ${rawLine}` };
    }
    return nineteenTailNumbers(nineteenMatch[1]).map((number) =>
      createLine(BetType.TWO_BOTTOM, number, amount, rawLine),
    );
  }

  const runMatch = line.match(/^(\d)=(\d+(?:\.\d+)?)$/);
  if (runMatch) {
    const amount = parseAmount(runMatch[2]);
    if (!amount) {
      return { error: `จำนวนเงินไม่ถูกต้อง: ${rawLine}` };
    }
    return [createLine(BetType.RUN_BOTTOM, runMatch[1], amount, rawLine)];
  }

  const twoBottomSplitMatch = line.match(/^(\d{2})=(\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)$/);
  if (twoBottomSplitMatch) {
    const straightAmount = parseAmount(twoBottomSplitMatch[2]);
    const reverseAmount = parseAmount(twoBottomSplitMatch[3]);
    if (!straightAmount || !reverseAmount) {
      return { error: `จำนวนเงินไม่ถูกต้อง: ${rawLine}` };
    }
    return [
      createLine(BetType.TWO_BOTTOM, twoBottomSplitMatch[1], straightAmount, rawLine),
      createLine(BetType.TWO_BOTTOM, twoBottomSplitMatch[1].split("").reverse().join(""), reverseAmount, rawLine),
    ];
  }

  const twoBottomMatch = line.match(/^(\d{2})=(\d+(?:\.\d+)?)$/);
  if (twoBottomMatch) {
    const amount = parseAmount(twoBottomMatch[2]);
    if (!amount) {
      return { error: `จำนวนเงินไม่ถูกต้อง: ${rawLine}` };
    }
    return [createLine(BetType.TWO_BOTTOM, twoBottomMatch[1], amount, rawLine)];
  }

  const permutationsMatch = line.match(/^(\d{3})\*=(\d+(?:\.\d+)?)$/);
  if (permutationsMatch) {
    const amount = parseAmount(permutationsMatch[2]);
    if (!amount) {
      return { error: `จำนวนเงินไม่ถูกต้อง: ${rawLine}` };
    }
    return permutations(permutationsMatch[1]).map((number) =>
      createLine(BetType.THREE_BOTTOM, number, amount, rawLine),
    );
  }

  const threeBottomMatch = line.match(/^(\d{3})=(\d+(?:\.\d+)?)$/);
  if (threeBottomMatch) {
    const amount = parseAmount(threeBottomMatch[2]);
    if (!amount) {
      return { error: `จำนวนเงินไม่ถูกต้อง: ${rawLine}` };
    }
    return [createLine(BetType.THREE_BOTTOM, threeBottomMatch[1], amount, rawLine)];
  }

  return {
    error:
      `รูปแบบคีย์ล่างไม่รองรับ: ${rawLine} เช่น 4=100, 45=100, 45=100/50, 456=100, 456*=10, 5=19*10`,
  };
}

function parseMixedLine(rawLine: string): ParsedQuickLine[] | ParseError {
  const line = rawLine.replace(/\s+/g, "");

  const twoSharedMatch = line.match(/^(\d{2})=(\d+(?:\.\d+)?)$/);
  if (twoSharedMatch) {
    const amount = parseAmount(twoSharedMatch[2]);
    if (!amount) {
      return { error: `จำนวนเงินไม่ถูกต้อง: ${rawLine}` };
    }
    return [
      createLine(BetType.TWO_TOP, twoSharedMatch[1], amount, rawLine),
      createLine(BetType.TWO_BOTTOM, twoSharedMatch[1], amount, rawLine),
    ];
  }

  const twoSplitMatch = line.match(/^(\d{2})=(\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)$/);
  if (twoSplitMatch) {
    const topAmount = parseAmount(twoSplitMatch[2]);
    const bottomAmount = parseAmount(twoSplitMatch[3]);
    if (!topAmount || !bottomAmount) {
      return { error: `จำนวนเงินไม่ถูกต้อง: ${rawLine}` };
    }
    return [
      createLine(BetType.TWO_TOP, twoSplitMatch[1], topAmount, rawLine),
      createLine(BetType.TWO_BOTTOM, twoSplitMatch[1], bottomAmount, rawLine),
    ];
  }

  const threeSharedMatch = line.match(/^(\d{3})=(\d+(?:\.\d+)?)$/);
  if (threeSharedMatch) {
    const amount = parseAmount(threeSharedMatch[2]);
    if (!amount) {
      return { error: `จำนวนเงินไม่ถูกต้อง: ${rawLine}` };
    }
    return [
      createLine(BetType.THREE_STRAIGHT, threeSharedMatch[1], amount, rawLine),
      createLine(BetType.THREE_BOTTOM, threeSharedMatch[1], amount, rawLine),
    ];
  }

  const threeSplitMatch = line.match(/^(\d{3})=(\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)$/);
  if (threeSplitMatch) {
    const topAmount = parseAmount(threeSplitMatch[2]);
    const bottomAmount = parseAmount(threeSplitMatch[3]);
    if (!topAmount || !bottomAmount) {
      return { error: `จำนวนเงินไม่ถูกต้อง: ${rawLine}` };
    }
    return [
      createLine(BetType.THREE_STRAIGHT, threeSplitMatch[1], topAmount, rawLine),
      createLine(BetType.THREE_BOTTOM, threeSplitMatch[1], bottomAmount, rawLine),
    ];
  }

  const straightTodBottomMatch = line.match(
    /^(\d{3})=(\d+(?:\.\d+)?)\*(\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)$/,
  );
  if (straightTodBottomMatch) {
    const topAmount = parseAmount(straightTodBottomMatch[2]);
    const todAmount = parseAmount(straightTodBottomMatch[3]);
    const bottomAmount = parseAmount(straightTodBottomMatch[4]);
    if (!topAmount || !todAmount || !bottomAmount) {
      return { error: `จำนวนเงินไม่ถูกต้อง: ${rawLine}` };
    }
    return [
      createLine(BetType.THREE_STRAIGHT, straightTodBottomMatch[1], topAmount, rawLine),
      createLine(BetType.THREE_TOD, straightTodBottomMatch[1], todAmount, rawLine),
      createLine(BetType.THREE_BOTTOM, straightTodBottomMatch[1], bottomAmount, rawLine),
    ];
  }

  const permutationsMatch = line.match(/^(\d{3})\*=(\d+(?:\.\d+)?)$/);
  if (permutationsMatch) {
    const amount = parseAmount(permutationsMatch[2]);
    if (!amount) {
      return { error: `จำนวนเงินไม่ถูกต้อง: ${rawLine}` };
    }
    return permutations(permutationsMatch[1]).flatMap((number) => [
      createLine(BetType.THREE_STRAIGHT, number, amount, rawLine),
      createLine(BetType.THREE_BOTTOM, number, amount, rawLine),
    ]);
  }

  return {
    error:
      `รูปแบบคีย์บน+ล่างไม่รองรับ: ${rawLine} เช่น 12=100, 12=100/50, 123=100, 123=100/50, 123=100*50/30, 123*=10`,
  };
}

export function parseQuickEntry(mode: QuickEntryMode, input: string): ParseSuccess | ParseError {
  const rawLines = input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (rawLines.length === 0) {
    return {
      error: "กรุณากรอกข้อความคีย์ลัดอย่างน้อย 1 บรรทัด",
    };
  }

  const lines: ParsedQuickLine[] = [];

  for (const rawLine of rawLines) {
    const parsed =
      mode === "TOP"
        ? parseTopLine(rawLine)
        : mode === "BOTTOM"
          ? parseBottomLine(rawLine)
          : parseMixedLine(rawLine);

    if ("error" in parsed) {
      return parsed;
    }

    lines.push(...parsed);
  }

  return { lines };
}
