import { BetType } from "@prisma/client";
import type { TicketDisplayType } from "@/lib/ticket-line";

export type LegacyEntryMode = "TOP" | "BOTTOM" | "MIXED";

export type LegacyDisplayType = TicketDisplayType;

export type ParsedPhpTicketLine = {
  betType: BetType;
  displayType: LegacyDisplayType;
  number: string;
  amount: number;
  source: string;
};

type ParseSuccess = {
  lines: ParsedPhpTicketLine[];
};

type ParseError = {
  error: string;
};

type ModeMatch = {
  mode: LegacyEntryMode;
  body: string;
  label: string;
};

function parseAmount(value: string) {
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0 ? amount : null;
}

function sortDigits(value: string) {
  return value.split("").sort().join("");
}

function formatSource(label: string, body: string) {
  return `${label}:${body.replace(/\s+/g, "")}`;
}

function uniquePermutations(value: string) {
  if (value.length !== 3) {
    return [value];
  }

  const results = new Set<string>();
  const digits = value.split("");

  for (let i = 0; i < digits.length; i += 1) {
    for (let j = 0; j < digits.length; j += 1) {
      if (j === i) {
        continue;
      }

      for (let k = 0; k < digits.length; k += 1) {
        if (k === i || k === j) {
          continue;
        }

        results.add(`${digits[i]}${digits[j]}${digits[k]}`);
      }
    }
  }

  return [...results];
}

function createLine(
  betType: BetType,
  number: string,
  amount: number,
  source: string,
  displayType: LegacyDisplayType = betType,
): ParsedPhpTicketLine {
  return {
    betType,
    displayType,
    number,
    amount,
    source,
  };
}

function detectMode(rawLine: string): ModeMatch | null {
  const line = rawLine.trim();
  const match = line.match(/^(บ\s*ล|บล|บนล่าง|บน\+ล่าง|mix|mixed|บน|บ|top|ล่าง|ล|bottom)\s*:\s*(.+)$/i);

  if (!match) {
    return null;
  }

  const token = match[1].toLowerCase().replace(/\s+/g, "");
  const body = match[2].trim();

  if (["บล", "บนล่าง", "บน+ล่าง", "mix", "mixed"].includes(token)) {
    return { mode: "MIXED", body, label: "บ ล" };
  }

  if (["บ", "บน", "top"].includes(token)) {
    return { mode: "TOP", body, label: "บ" };
  }

  if (["ล", "ล่าง", "bottom"].includes(token)) {
    return { mode: "BOTTOM", body, label: "ล" };
  }

  return null;
}

function parseTopBody(body: string, source: string): ParsedPhpTicketLine[] | ParseError {
  const runMatch = body.match(/^(\d)=(\d+(?:\.\d+)?)$/);
  if (runMatch) {
    const amount = parseAmount(runMatch[2]);
    if (!amount) {
      return { error: `จำนวนเงินไม่ถูกต้อง: ${source}` };
    }
    return [createLine(BetType.RUN_TOP, runMatch[1], amount, source)];
  }

  const twoTodMatch = body.match(/^(\d{2})=\*(\d+(?:\.\d+)?)$/);
  if (twoTodMatch) {
    const amount = parseAmount(twoTodMatch[2]);
    if (!amount) {
      return { error: `จำนวนเงินไม่ถูกต้อง: ${source}` };
    }
    return [createLine(BetType.TWO_TOP, sortDigits(twoTodMatch[1]), amount, source, "TWO_TOD")];
  }

  const twoTopTodMatch = body.match(/^(\d{2})=(\d+(?:\.\d+)?)\*(\d+(?:\.\d+)?)$/);
  if (twoTopTodMatch) {
    const topAmount = parseAmount(twoTopTodMatch[2]);
    const todAmount = parseAmount(twoTopTodMatch[3]);
    if (!topAmount || !todAmount) {
      return { error: `เธเธณเธเธงเธเน€เธเธดเธเนเธกเนเธ–เธนเธเธ•เนเธญเธ: ${source}` };
    }
    return [
      createLine(BetType.TWO_TOP, twoTopTodMatch[1], topAmount, source),
      createLine(BetType.TWO_TOP, sortDigits(twoTopTodMatch[1]), todAmount, source, "TWO_TOD"),
    ];
  }

  const twoTopMatch = body.match(/^(\d{2})=(\d+(?:\.\d+)?)$/);
  if (twoTopMatch) {
    const amount = parseAmount(twoTopMatch[2]);
    if (!amount) {
      return { error: `จำนวนเงินไม่ถูกต้อง: ${source}` };
    }
    return [createLine(BetType.TWO_TOP, twoTopMatch[1], amount, source)];
  }

  const threePermutationsMatch = body.match(/^(\d{3})\*=(\d+(?:\.\d+)?)$/);
  if (threePermutationsMatch) {
    const amount = parseAmount(threePermutationsMatch[2]);
    if (!amount) {
      return { error: `จำนวนเงินไม่ถูกต้อง: ${source}` };
    }
    return uniquePermutations(threePermutationsMatch[1]).map((number) =>
      createLine(BetType.THREE_STRAIGHT, number, amount, source),
    );
  }

  const threeStraightTodMatch = body.match(/^(\d{3})=(\d+(?:\.\d+)?)\*(\d+(?:\.\d+)?)$/);
  if (threeStraightTodMatch) {
    const straightAmount = parseAmount(threeStraightTodMatch[2]);
    const todAmount = parseAmount(threeStraightTodMatch[3]);
    if (!straightAmount || !todAmount) {
      return { error: `จำนวนเงินไม่ถูกต้อง: ${source}` };
    }
    return [
      createLine(BetType.THREE_STRAIGHT, threeStraightTodMatch[1], straightAmount, source),
      createLine(BetType.THREE_TOD, sortDigits(threeStraightTodMatch[1]), todAmount, source),
    ];
  }

  const threeTopMatch = body.match(/^(\d{3})=(\d+(?:\.\d+)?)$/);
  if (threeTopMatch) {
    const amount = parseAmount(threeTopMatch[2]);
    if (!amount) {
      return { error: `จำนวนเงินไม่ถูกต้อง: ${source}` };
    }
    return [createLine(BetType.THREE_STRAIGHT, threeTopMatch[1], amount, source)];
  }

  return {
    error: `รูปแบบคีย์บนไม่รองรับ: ${source}`,
  };
}

function parseBottomBody(body: string, source: string): ParsedPhpTicketLine[] | ParseError {
  const runMatch = body.match(/^(\d)=(\d+(?:\.\d+)?)$/);
  if (runMatch) {
    const amount = parseAmount(runMatch[2]);
    if (!amount) {
      return { error: `จำนวนเงินไม่ถูกต้อง: ${source}` };
    }
    return [createLine(BetType.RUN_BOTTOM, runMatch[1], amount, source)];
  }

  const twoBottomSplitMatch = body.match(/^(\d{2})=(\d+(?:\.\d+)?)\*(\d+(?:\.\d+)?)$/);
  if (twoBottomSplitMatch) {
    const straightAmount = parseAmount(twoBottomSplitMatch[2]);
    const reverseAmount = parseAmount(twoBottomSplitMatch[3]);
    if (!straightAmount || !reverseAmount) {
      return { error: `จำนวนเงินไม่ถูกต้อง: ${source}` };
    }
    const straight = twoBottomSplitMatch[1];
    const reverse = straight.split("").reverse().join("");
    return [
      createLine(BetType.TWO_BOTTOM, straight, straightAmount, source),
      createLine(BetType.TWO_BOTTOM, reverse, reverseAmount, source),
    ];
  }

  const twoBottomMatch = body.match(/^(\d{2})=(\d+(?:\.\d+)?)$/);
  if (twoBottomMatch) {
    const amount = parseAmount(twoBottomMatch[2]);
    if (!amount) {
      return { error: `จำนวนเงินไม่ถูกต้อง: ${source}` };
    }
    return [createLine(BetType.TWO_BOTTOM, twoBottomMatch[1], amount, source)];
  }

  const threePermutationsMatch = body.match(/^(\d{3})\*=(\d+(?:\.\d+)?)$/);
  if (threePermutationsMatch) {
    const amount = parseAmount(threePermutationsMatch[2]);
    if (!amount) {
      return { error: `จำนวนเงินไม่ถูกต้อง: ${source}` };
    }
    return uniquePermutations(threePermutationsMatch[1]).map((number) =>
      createLine(BetType.THREE_BOTTOM, number, amount, source),
    );
  }

  const threeBottomMatch = body.match(/^(\d{3})=(\d+(?:\.\d+)?)$/);
  if (threeBottomMatch) {
    const amount = parseAmount(threeBottomMatch[2]);
    if (!amount) {
      return { error: `จำนวนเงินไม่ถูกต้อง: ${source}` };
    }
    return [createLine(BetType.THREE_BOTTOM, threeBottomMatch[1], amount, source)];
  }

  return {
    error: `รูปแบบคีย์ล่างไม่รองรับ: ${source}`,
  };
}

function parseMixedBody(body: string, source: string): ParsedPhpTicketLine[] | ParseError {
  const runMatch = body.match(/^(\d)=(\d+(?:\.\d+)?)$/);
  if (runMatch) {
    const amount = parseAmount(runMatch[2]);
    if (!amount) {
      return { error: `จำนวนเงินไม่ถูกต้อง: ${source}` };
    }
    return [
      createLine(BetType.RUN_TOP, runMatch[1], amount, source),
      createLine(BetType.RUN_BOTTOM, runMatch[1], amount, source),
    ];
  }

  const twoSplitMatch = body.match(/^(\d{2})=(\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)$/);
  if (twoSplitMatch) {
    const topAmount = parseAmount(twoSplitMatch[2]);
    const bottomAmount = parseAmount(twoSplitMatch[3]);
    if (!topAmount || !bottomAmount) {
      return { error: `จำนวนเงินไม่ถูกต้อง: ${source}` };
    }
    return [
      createLine(BetType.TWO_TOP, twoSplitMatch[1], topAmount, source),
      createLine(BetType.TWO_BOTTOM, twoSplitMatch[1], bottomAmount, source),
    ];
  }

  const twoStarMatch = body.match(/^(\d{2})=(\d+(?:\.\d+)?)\*(\d+(?:\.\d+)?)$/);
  if (twoStarMatch) {
    const topAmount = parseAmount(twoStarMatch[2]);
    const bottomAmount = parseAmount(twoStarMatch[3]);
    if (!topAmount || !bottomAmount) {
      return { error: `จำนวนเงินไม่ถูกต้อง: ${source}` };
    }
    return [
      createLine(BetType.TWO_TOP, twoStarMatch[1], topAmount, source),
      createLine(BetType.TWO_BOTTOM, twoStarMatch[1].split("").reverse().join(""), bottomAmount, source),
    ];
  }

  const twoSharedMatch = body.match(/^(\d{2})=(\d+(?:\.\d+)?)$/);
  if (twoSharedMatch) {
    const amount = parseAmount(twoSharedMatch[2]);
    if (!amount) {
      return { error: `จำนวนเงินไม่ถูกต้อง: ${source}` };
    }
    return [
      createLine(BetType.TWO_TOP, twoSharedMatch[1], amount, source),
      createLine(BetType.TWO_BOTTOM, twoSharedMatch[1], amount, source),
    ];
  }

  const threeSplitMatch = body.match(/^(\d{3})=(\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)$/);
  if (threeSplitMatch) {
    const topAmount = parseAmount(threeSplitMatch[2]);
    const bottomAmount = parseAmount(threeSplitMatch[3]);
    if (!topAmount || !bottomAmount) {
      return { error: `จำนวนเงินไม่ถูกต้อง: ${source}` };
    }
    return [
      createLine(BetType.THREE_STRAIGHT, threeSplitMatch[1], topAmount, source),
      createLine(BetType.THREE_BOTTOM, threeSplitMatch[1], bottomAmount, source),
    ];
  }

  const straightTodBottomMatch = body.match(/^(\d{3})=(\d+(?:\.\d+)?)\*(\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)$/);
  if (straightTodBottomMatch) {
    const topAmount = parseAmount(straightTodBottomMatch[2]);
    const todAmount = parseAmount(straightTodBottomMatch[3]);
    const bottomAmount = parseAmount(straightTodBottomMatch[4]);
    if (!topAmount || !todAmount || !bottomAmount) {
      return { error: `จำนวนเงินไม่ถูกต้อง: ${source}` };
    }
    return [
      createLine(BetType.THREE_STRAIGHT, straightTodBottomMatch[1], topAmount, source),
      createLine(BetType.THREE_TOD, sortDigits(straightTodBottomMatch[1]), todAmount, source),
      createLine(BetType.THREE_BOTTOM, straightTodBottomMatch[1], bottomAmount, source),
    ];
  }

  const threeSharedMatch = body.match(/^(\d{3})=(\d+(?:\.\d+)?)$/);
  if (threeSharedMatch) {
    const amount = parseAmount(threeSharedMatch[2]);
    if (!amount) {
      return { error: `จำนวนเงินไม่ถูกต้อง: ${source}` };
    }
    return [
      createLine(BetType.THREE_STRAIGHT, threeSharedMatch[1], amount, source),
      createLine(BetType.THREE_BOTTOM, threeSharedMatch[1], amount, source),
    ];
  }

  return {
    error: `รูปแบบคีย์บนล่างไม่รองรับ: ${source}`,
  };
}

export function parsePhpTicketInput(input: string): ParseSuccess | ParseError {
  const rawLines = input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (rawLines.length === 0) {
    return { error: "กรุณากรอกข้อความคีย์โพยอย่างน้อย 1 บรรทัด" };
  }

  const lines: ParsedPhpTicketLine[] = [];

  for (const rawLine of rawLines) {
    const matched = detectMode(rawLine);

    if (!matched) {
      return {
        error: `รูปแบบไม่ถูกต้อง: ${rawLine} ต้องขึ้นต้นด้วย บ:, ล: หรือ บล:`,
      };
    }

    const source = formatSource(matched.label, matched.body);
    const parsed =
      matched.mode === "TOP"
        ? parseTopBody(matched.body, source)
        : matched.mode === "BOTTOM"
          ? parseBottomBody(matched.body, source)
          : parseMixedBody(matched.body, source);

    if ("error" in parsed) {
      return parsed;
    }

    lines.push(...parsed);
  }

  return { lines };
}
