"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { BetType, Role } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { FormSubmit } from "@/components/ui/form-submit";
import { Input } from "@/components/ui/input";
import { LegacyModal } from "@/components/ui/legacy-modal";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Textarea } from "@/components/ui/textarea";
import { createTicketAction, updateTicketAction, type TicketActionState } from "@/lib/actions/tickets";
import { showErrorAlert, showSuccessAlert } from "@/lib/client-alerts";
import { betTypeLabels } from "@/lib/constants";
import type { UserCompatSettings } from "@/lib/php-compat-shared";
import { parsePhpTicketInput, type LegacyDisplayType, type ParsedPhpTicketLine } from "@/lib/php-ticket-parser";
import { parseQuickEntry, type QuickEntryMode } from "@/lib/quick-entry";
import { buildPricingMaps, getLinePricing } from "@/lib/ticket-pricing";
import { getTicketLineLabel } from "@/lib/ticket-line";
import { formatCurrency } from "@/lib/utils";

type DrawOption = {
  id: string;
  name: string;
  closeAt: string;
  rates: Array<{
    betType: BetType;
    payout: number;
    commission: number;
    isOpen: boolean;
  }>;
};

type CustomerOption = {
  id: string;
  name: string;
  role: Role;
};

type CommissionProfile = {
  role: Role;
  betType: BetType;
  payout: number;
  commission: number;
};

type TicketEntryProps = {
  draws: DrawOption[];
  customers: CustomerOption[];
  commissionProfiles: CommissionProfile[];
  customerSettings: Record<string, UserCompatSettings>;
  role: "ADMIN" | "AGENT" | "CUSTOMER";
  defaultCustomerId?: string;
  defaultDrawId?: string;
  initialLines?: LocalLine[];
  initialNote?: string | null;
  mode?: "create" | "edit";
  ticketId?: string;
};

type LocalLine = ParsedPhpTicketLine;

type PreviewGroup = {
  key: LegacyDisplayType;
  label: string;
  items: LocalLine[];
};

type TicketListSummaryRow = {
  key: string;
  label: string;
  count: number;
  totalAmount: number;
};

const initialState: TicketActionState = {};

const displayTypeLabels: Record<LegacyDisplayType, string> = {
  TWO_TOP: "2 ตัวบน",
  TWO_BOTTOM: "2 ตัวล่าง",
  THREE_STRAIGHT: "3 ตัวบน",
  THREE_TOD: "3 ตัวโต๊ด",
  THREE_BOTTOM: "3 ตัวล่าง",
  FRONT_THREE: "3 ตัวหน้า",
  BACK_THREE: "3 ตัวท้าย",
  RUN_TOP: "ลอยบน",
  RUN_BOTTOM: "ลอยล่าง",
  TWO_TOD: "คู่โต๊ด",
};

const previewOrder: LegacyDisplayType[] = [
  "TWO_TOP",
  "TWO_BOTTOM",
  "THREE_STRAIGHT",
  "THREE_TOD",
  "THREE_BOTTOM",
  "TWO_TOD",
  "RUN_TOP",
  "RUN_BOTTOM",
];

const quickModeLabels: Record<QuickEntryMode, string> = {
  TOP: "คีย์บน",
  BOTTOM: "คีย์ล่าง",
  MIXED: "คีย์บน+ล่าง",
};

const quickModePlaceholders: Record<QuickEntryMode, string> = {
  TOP: "00=200\n01=200\n001*=150\n103=500*500\n24=*200\n5=5000",
  BOTTOM: "01=200*200\n080=200\n64=100/50\n264=300\n6=500",
  MIXED: "12=100\n12=100/50\n123=100\n123=100*50/30\n5=300",
};

const helperTypes: Array<{
  key: LegacyDisplayType;
  betType: BetType;
  digits: number;
  label: string;
}> = [
  { key: "TWO_TOP", betType: BetType.TWO_TOP, digits: 2, label: "2 ตัวบน" },
  { key: "TWO_BOTTOM", betType: BetType.TWO_BOTTOM, digits: 2, label: "2 ตัวล่าง" },
  { key: "TWO_TOD", betType: BetType.TWO_TOP, digits: 2, label: "คู่โต๊ด" },
  { key: "THREE_STRAIGHT", betType: BetType.THREE_STRAIGHT, digits: 3, label: "3 ตัวบน" },
  { key: "THREE_TOD", betType: BetType.THREE_TOD, digits: 3, label: "3 โต๊ด" },
  { key: "THREE_BOTTOM", betType: BetType.THREE_BOTTOM, digits: 3, label: "3 ตัวล่าง" },
  { key: "RUN_TOP", betType: BetType.RUN_TOP, digits: 1, label: "วิ่งบน" },
  { key: "RUN_BOTTOM", betType: BetType.RUN_BOTTOM, digits: 1, label: "วิ่งล่าง" },
];

const helperAmountPresets = [50, 100, 200, 300, 500, 1000];

type EntryMode = "HELPER" | "NUMBER" | "QUICK" | "PHP";

const entryModeOptions: Array<{
  key: EntryMode;
  label: string;
}> = [
  { key: "NUMBER", label: "ระบุตัวเลข" },
  { key: "HELPER", label: "Tool ช่วยคีย์" },
  { key: "QUICK", label: "คีย์ลัดแบบเร็ว" },
  { key: "PHP", label: "ฟอร์แมต PHP" },
];

const phpFormatExamples = [
  {
    title: "คีย์บน",
    items: [
      { code: "บ:5=500", meaning: "วิ่งบน" },
      { code: "บ:80=500", meaning: "2 ตัวบน" },
      { code: "บ:80=*500", meaning: "คู่โต๊ด" },
      { code: "บ:80=500*500", meaning: "2 ตัวบน + คู่โต๊ด" },
      { code: "บ:123=500", meaning: "3 ตัวบน" },
      { code: "บ:123*500", meaning: "3 โต๊ด" },
      { code: "บ:123=500*500", meaning: "3 ตัวบน + 3 โต๊ด" },
      { code: "บ:123*=500", meaning: "3 ตัวบนกลับ 6 กลับ" },
    ],
  },
  {
    title: "คีย์ล่าง",
    items: [
      { code: "ล:6=500", meaning: "วิ่งล่าง" },
      { code: "ล:80=500", meaning: "2 ตัวล่าง" },
      { code: "ล:80=500*300", meaning: "2 ตัวล่างแยกตรง/กลับ" },
      { code: "ล:123=500", meaning: "3 ตัวล่าง" },
      { code: "ล:123*=500", meaning: "3 ตัวล่างกลับ 6 กลับ" },
    ],
  },
  {
    title: "คีย์บนล่าง",
    items: [
      { code: "บล:5=500", meaning: "วิ่งบน + วิ่งล่าง" },
      { code: "บล:80=500", meaning: "2 บน + 2 ล่าง เท่ากัน" },
      { code: "บล:80=500/300", meaning: "2 บน / 2 ล่าง คนละยอด" },
      { code: "บล:80=500*300", meaning: "2 บน / 2 ล่างกลับ" },
      { code: "บล:123=500", meaning: "3 บน + 3 ล่าง เท่ากัน" },
      { code: "บล:123=500/300", meaning: "3 บน / 3 ล่าง คนละยอด" },
      { code: "บล:123=500*300/200", meaning: "3 บน + 3 โต๊ด + 3 ล่าง" },
      { code: "บล:123*=500", meaning: "3 บนกลับ + 3 ล่างกลับ" },
    ],
  },
] as const;

const quickFormatExamples = [
  {
    title: "คีย์บน",
    items: [
      { code: "5=100", meaning: "วิ่งบน" },
      { code: "80=100", meaning: "2 ตัวบน" },
      { code: "123=100", meaning: "3 ตัวบน" },
      { code: "123*50", meaning: "3 โต๊ด" },
      { code: "123=100*50", meaning: "3 ตัวบน + 3 โต๊ด" },
      { code: "123*=10", meaning: "3 ตัวบนกลับ 6 กลับ" },
      { code: "5=19*10", meaning: "19 ประตูบน" },
    ],
  },
  {
    title: "คีย์ล่าง",
    items: [
      { code: "4=100", meaning: "วิ่งล่าง" },
      { code: "45=100", meaning: "2 ตัวล่าง" },
      { code: "45=100/50", meaning: "2 ตัวล่างตรง/กลับ" },
      { code: "456=100", meaning: "3 ตัวล่าง" },
      { code: "456*=10", meaning: "3 ตัวล่างกลับ 6 กลับ" },
      { code: "5=19*10", meaning: "19 ประตูล่าง" },
    ],
  },
  {
    title: "คีย์บน+ล่าง",
    items: [
      { code: "12=100", meaning: "2 บน + 2 ล่าง เท่ากัน" },
      { code: "12=100/50", meaning: "2 บน / 2 ล่าง คนละยอด" },
      { code: "123=100", meaning: "3 บน + 3 ล่าง เท่ากัน" },
      { code: "123=100/50", meaning: "3 บน / 3 ล่าง คนละยอด" },
      { code: "123=100*50/30", meaning: "3 บน + 3 โต๊ด + 3 ล่าง" },
      { code: "123*=10", meaning: "3 บนกลับ + 3 ล่างกลับ" },
    ],
  },
] as const;

type NumberEntryOption = {
  key: string;
  label: string;
  buildLines: (number: string, amount: number) => LocalLine[];
};

function reverseDigits(value: string) {
  return value.split("").reverse().join("");
}

function uniqueThreePermutations(value: string) {
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

function sortDigits(value: string) {
  return value.split("").sort().join("");
}

function createNumberEntryLine(
  betType: BetType,
  number: string,
  amount: number,
  source: string,
  displayType: LegacyDisplayType = betType,
): LocalLine {
  return {
    betType,
    displayType,
    number: displayType === "TWO_TOD" ? sortDigits(number) : number,
    amount,
    source,
  };
}

function normalizeHelperNumber(value: string, type: LegacyDisplayType) {
  const config = helperTypes.find((item) => item.key === type);
  if (!config) {
    return "";
  }

  const digits = value.replace(/\D/g, "").slice(0, config.digits);

  if (type === "TWO_TOD" || type === "THREE_TOD") {
    return sortDigits(digits);
  }

  return digits;
}

function buildHelperSource(type: LegacyDisplayType, number: string, amount: number) {
  switch (type) {
    case "TWO_TOP":
      return `บ:${number}=${amount}`;
    case "TWO_BOTTOM":
      return `ล:${number}=${amount}`;
    case "TWO_TOD":
      return `บ:${number}=*${amount}`;
    case "THREE_STRAIGHT":
      return `บ:${number}=${amount}`;
    case "THREE_TOD":
      return `บ:${number}*${amount}`;
    case "THREE_BOTTOM":
      return `ล:${number}=${amount}`;
    case "RUN_TOP":
      return `บ:${number}=${amount}`;
    case "RUN_BOTTOM":
      return `ล:${number}=${amount}`;
    default:
      return `${number}=${amount}`;
  }
}

function buildPreviewGroups(lines: LocalLine[]) {
  return previewOrder
    .map((key) => ({
      key,
      label: displayTypeLabels[key],
      items: lines
        .filter((line) => line.displayType === key)
        .slice()
        .sort((a, b) => a.number.localeCompare(b.number) || b.amount - a.amount),
    }))
    .filter((group) => group.items.length > 0);
}

function buildTicketListSummary(lines: LocalLine[]): TicketListSummaryRow[] {
  const totals = new Map<string, TicketListSummaryRow>();

  for (const line of lines) {
    const key = line.displayType;
    const label = displayTypeLabels[line.displayType] ?? betTypeLabels[line.betType];
    const current = totals.get(key) ?? {
      key,
      label,
      count: 0,
      totalAmount: 0,
    };

    current.count += 1;
    current.totalAmount += line.amount;
    totals.set(key, current);
  }

  return previewOrder
    .map((key) => totals.get(key))
    .filter((item): item is TicketListSummaryRow => Boolean(item));
}

const numberEntryOptionsByDigits: Record<number, NumberEntryOption[]> = {
  1: [
    {
      key: "RUN_TOP",
      label: "วิ่งบน",
      buildLines: (number, amount) => [createNumberEntryLine(BetType.RUN_TOP, number, amount, `บ:${number}=${amount}`)],
    },
    {
      key: "RUN_BOTTOM",
      label: "วิ่งล่าง",
      buildLines: (number, amount) => [createNumberEntryLine(BetType.RUN_BOTTOM, number, amount, `ล:${number}=${amount}`)],
    },
    {
      key: "TAIL19_TOP",
      label: "19 หางบน",
      buildLines: (number, amount) =>
        nineteenTailNumbers(number).map((item) =>
          createNumberEntryLine(BetType.TWO_TOP, item, amount, `บ:${number}=19*${amount}`),
        ),
    },
    {
      key: "TAIL19_BOTTOM",
      label: "19 หางล่าง",
      buildLines: (number, amount) =>
        nineteenTailNumbers(number).map((item) =>
          createNumberEntryLine(BetType.TWO_BOTTOM, item, amount, `ล:${number}=19*${amount}`),
        ),
    },
  ],
  2: [
    {
      key: "TWO_TOP",
      label: "2 บน",
      buildLines: (number, amount) => [createNumberEntryLine(BetType.TWO_TOP, number, amount, `บ:${number}=${amount}`)],
    },
    {
      key: "TWO_BOTTOM",
      label: "2 ล่าง",
      buildLines: (number, amount) => [createNumberEntryLine(BetType.TWO_BOTTOM, number, amount, `ล:${number}=${amount}`)],
    },
    {
      key: "TWO_MIXED",
      label: "2 บน + 2 ล่าง",
      buildLines: (number, amount) => [
        createNumberEntryLine(BetType.TWO_TOP, number, amount, `บล:${number}=${amount}`),
        createNumberEntryLine(BetType.TWO_BOTTOM, number, amount, `บล:${number}=${amount}`),
      ],
    },
    {
      key: "TWO_TOP_REVERSED",
      label: "2 บนกลับ",
      buildLines: (number, amount) => [
        createNumberEntryLine(BetType.TWO_TOP, reverseDigits(number), amount, `บ:${reverseDigits(number)}=${amount}`),
      ],
    },
    {
      key: "TWO_BOTTOM_REVERSED",
      label: "2 ล่างกลับ",
      buildLines: (number, amount) => [
        createNumberEntryLine(BetType.TWO_BOTTOM, reverseDigits(number), amount, `ล:${reverseDigits(number)}=${amount}`),
      ],
    },
    {
      key: "TWO_REVERSED_MIXED",
      label: "2 กลับ บน + ล่าง",
      buildLines: (number, amount) => [
        createNumberEntryLine(BetType.TWO_TOP, reverseDigits(number), amount, `บล:${reverseDigits(number)}=${amount}`),
        createNumberEntryLine(BetType.TWO_BOTTOM, reverseDigits(number), amount, `บล:${reverseDigits(number)}=${amount}`),
      ],
    },
    {
      key: "TWO_TOD",
      label: "2 โต๊ดบน",
      buildLines: (number, amount) => [
        createNumberEntryLine(BetType.TWO_TOP, number, amount, `บ:${number}=*${amount}`, "TWO_TOD"),
      ],
    },
  ],
  3: [
    {
      key: "THREE_TOP",
      label: "3 บน",
      buildLines: (number, amount) => [createNumberEntryLine(BetType.THREE_STRAIGHT, number, amount, `บ:${number}=${amount}`)],
    },
    {
      key: "THREE_TOD",
      label: "3 โต๊ดบน",
      buildLines: (number, amount) => [createNumberEntryLine(BetType.THREE_TOD, number, amount, `บ:${number}*${amount}`)],
    },
    {
      key: "THREE_PERMUTATIONS_TOP",
      label: "3,6 กลับบน",
      buildLines: (number, amount) =>
        uniqueThreePermutations(number).map((item) =>
          createNumberEntryLine(BetType.THREE_STRAIGHT, item, amount, `บ:${number}*=${amount}`),
        ),
    },
  ],
};

function getNumberEntryOptions(number: string) {
  const options = numberEntryOptionsByDigits[number.length] ?? [];

  if (number.length === 2) {
    const reversed = reverseDigits(number);

    return options.filter((option) => {
      if (
        option.key === "TWO_TOP_REVERSED" ||
        option.key === "TWO_BOTTOM_REVERSED" ||
        option.key === "TWO_REVERSED_MIXED"
      ) {
        return reversed !== number;
      }

      return true;
    });
  }

  if (number.length === 3) {
    const permutations = uniqueThreePermutations(number);
    const permutationCount = permutations.length;

    return options.flatMap((option) => {
      if (option.key !== "THREE_PERMUTATIONS_TOP") {
        return [option];
      }

      if (permutationCount <= 1) {
        return [];
      }

      return [
        {
          ...option,
          label: `${permutationCount} กลับบน`,
          buildLines: (_number: string, amount: number) =>
            permutations.map((item) =>
              createNumberEntryLine(BetType.THREE_STRAIGHT, item, amount, `${permutationCount} กลับบน`),
            ),
        },
      ];
    });
  }

  return options;
}

function sanitizeDecimalInput(value: string) {
  const cleaned = value.replace(/[^0-9.]/g, "");
  const [integerPart, ...decimalParts] = cleaned.split(".");

  return decimalParts.length > 0 ? `${integerPart}.${decimalParts.join("")}` : integerPart;
}

function getPositiveAmount(value?: string) {
  const amount = Number(value ?? "");
  return Number.isFinite(amount) && amount > 0 ? amount : null;
}

export function TicketEntry({
  draws,
  customers,
  commissionProfiles,
  customerSettings,
  role,
  defaultCustomerId,
  defaultDrawId,
  initialLines = [],
  initialNote,
  mode = "create",
  ticketId,
}: TicketEntryProps) {
  const isCustomerRole = role === "CUSTOMER";
  const router = useRouter();
  const [state, action] = useActionState(mode === "edit" ? updateTicketAction : createTicketAction, initialState);
  const [selectedDrawId, setSelectedDrawId] = useState(defaultDrawId ?? draws[0]?.id ?? "");
  const [selectedCustomerId, setSelectedCustomerId] = useState(defaultCustomerId ?? customers[0]?.id ?? "");
  const [entryMode, setEntryMode] = useState<EntryMode>("NUMBER");
  const [helperType, setHelperType] = useState<LegacyDisplayType>("TWO_TOP");
  const [helperNumber, setHelperNumber] = useState("");
  const [helperAmount, setHelperAmount] = useState("");
  const [helperError, setHelperError] = useState("");
  const [numberEntryNumber, setNumberEntryNumber] = useState("");
  const [numberEntryAmounts, setNumberEntryAmounts] = useState<Record<string, string>>({});
  const [numberEntryError, setNumberEntryError] = useState("");
  const [quickMode, setQuickMode] = useState<QuickEntryMode>("TOP");
  const [quickText, setQuickText] = useState("");
  const [quickError, setQuickError] = useState("");
  const [rawText, setRawText] = useState("");
  const [parseError, setParseError] = useState("");
  const [quickHelpOpen, setQuickHelpOpen] = useState(false);
  const [phpHelpOpen, setPhpHelpOpen] = useState(false);
  const [lines, setLines] = useState<LocalLine[]>(initialLines);
  const [previewLines, setPreviewLines] = useState<LocalLine[]>([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const helperNumberRef = useRef<HTMLInputElement | null>(null);
  const numberEntryInputRef = useRef<HTMLInputElement | null>(null);

  const selectedDraw = useMemo(
    () => draws.find((draw) => draw.id === selectedDrawId) ?? draws[0],
    [draws, selectedDrawId],
  );
  const selectedRates = useMemo(() => selectedDraw?.rates ?? [], [selectedDraw]);
  const selectedCustomer = customers.find((customer) => customer.id === selectedCustomerId) ?? customers[0];

  const selectedRateMap = useMemo(
    () => new Map(selectedRates.map((rate) => [rate.betType, rate])),
    [selectedRates],
  );
  const drawOptions = useMemo(
    () =>
      draws.map((draw) => ({
        value: draw.id,
        label: draw.name,
      })),
    [draws],
  );
  const customerOptions = useMemo(
    () =>
      customers.map((customer) => ({
        value: customer.id,
        label: customer.name,
      })),
    [customers],
  );
  const pricingMaps = useMemo(
    () =>
      buildPricingMaps(
        selectedRates,
        commissionProfiles,
        selectedCustomer?.role ?? Role.CUSTOMER,
        selectedCustomer ? customerSettings[selectedCustomer.id] : undefined,
      ),
    [commissionProfiles, customerSettings, selectedCustomer, selectedRates],
  );

  const totals = useMemo(() => {
    const subtotal = lines.reduce((sum, line) => sum + line.amount, 0);
    const discount = lines.reduce((sum, line) => {
      const rate = selectedRateMap.get(line.betType);
      const commission = getLinePricing(line, pricingMaps, rate).commission;
      return sum + (line.amount * commission) / 100;
    }, 0);

    return {
      subtotal,
      discount,
      total: subtotal - discount,
    };
  }, [lines, pricingMaps, selectedRateMap]);
  const pricingRows = useMemo(() => {
    const rows: Array<{
      key: LegacyDisplayType;
      label: string;
      payout: number;
      commission: number;
      isOpen: boolean;
    }> = selectedRates.map((rate) => {
      const pricing = getLinePricing(
        { betType: rate.betType, displayType: rate.betType },
        pricingMaps,
        rate,
      );

      return {
        key: rate.betType,
        label: getTicketLineLabel(rate.betType),
        payout: pricing.payout,
        commission: pricing.commission,
        isOpen: rate.isOpen,
      };
    });

    const hasTwoTod = lines.some((line) => line.displayType === "TWO_TOD");
    const twoTopRate = selectedRateMap.get(BetType.TWO_TOP);

    if (hasTwoTod && twoTopRate) {
      const pricing = getLinePricing(
        { betType: BetType.TWO_TOP, displayType: "TWO_TOD" },
        pricingMaps,
        twoTopRate,
      );

      rows.splice(
        Math.min(3, rows.length),
        0,
        {
          key: "TWO_TOD",
          label: displayTypeLabels.TWO_TOD,
          payout: pricing.payout,
          commission: pricing.commission,
          isOpen: twoTopRate.isOpen,
        },
      );
    }

    return rows;
  }, [lines, pricingMaps, selectedRateMap, selectedRates]);

  const previewGroups = useMemo(() => buildPreviewGroups(previewLines), [previewLines]);
  const helperConfig = useMemo(
    () => helperTypes.find((item) => item.key === helperType) ?? helperTypes[0]!,
    [helperType],
  );
  const helperPreview = useMemo(() => {
    const normalizedNumber = normalizeHelperNumber(helperNumber, helperType);
    const parsedAmount = Number(helperAmount);
    const safeAmount = Number.isFinite(parsedAmount) && parsedAmount > 0 ? parsedAmount : 0;

    return normalizedNumber && safeAmount > 0 ? buildHelperSource(helperType, normalizedNumber, safeAmount) : "";
  }, [helperAmount, helperNumber, helperType]);
  const numberEntryOptions = useMemo(
    () => getNumberEntryOptions(numberEntryNumber),
    [numberEntryNumber],
  );
  const ticketListSummary = useMemo(() => buildTicketListSummary(lines), [lines]);
  const availableEntryModeOptions = useMemo(
    () => (isCustomerRole ? entryModeOptions.filter((option) => option.key === "NUMBER") : entryModeOptions),
    [isCustomerRole],
  );

  useEffect(() => {
    if (state.error) {
      void showErrorAlert(state.error, "บันทึกโพยไม่สำเร็จ");
    }
  }, [state.error]);

  useEffect(() => {
    if (isCustomerRole && entryMode !== "NUMBER") {
      setEntryMode("NUMBER");
    }
  }, [entryMode, isCustomerRole]);

  useEffect(() => {
    if (!state.ok || !state.message) {
      return;
    }

    void showSuccessAlert(state.message).then(() => {
      if (state.redirectTo) {
        router.push(state.redirectTo);
      }
    });
  }, [router, state.message, state.ok, state.redirectTo]);

  function parseLegacyInput() {
    const parsed = parsePhpTicketInput(rawText);

    if ("error" in parsed) {
      setParseError(parsed.error);
      setPreviewOpen(false);
      return;
    }

    setParseError("");
    setPreviewLines(parsed.lines);
    setLines((current) => [...current, ...parsed.lines]);
    setPreviewOpen(true);
  }

  function parseQuickInput() {
    const parsed = parseQuickEntry(quickMode, quickText);

    if ("error" in parsed) {
      setQuickError(parsed.error);
      setPreviewOpen(false);
      return;
    }

    setQuickError("");
    setParseError("");
    const nextLines = parsed.lines.map((line) => ({ ...line, displayType: line.betType }));
    setPreviewLines(nextLines);
    setLines((current) => [
      ...current,
      ...nextLines,
    ]);
    setPreviewOpen(true);
  }

  function addHelperLine() {
    const normalizedNumber = normalizeHelperNumber(helperNumber, helperType);
    const amount = Number(helperAmount);

    if (normalizedNumber.length !== helperConfig.digits) {
      setHelperError(`เลขต้องมี ${helperConfig.digits} หลัก`);
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      setHelperError("จำนวนเงินต้องมากกว่า 0");
      return;
    }

    setHelperError("");
    const nextLine = {
      betType: helperConfig.betType,
      displayType: helperType,
      number: normalizedNumber,
      amount,
      source: buildHelperSource(helperType, normalizedNumber, amount),
    };
    setPreviewLines([nextLine]);
    setLines((current) => [...current, nextLine]);
    setHelperNumber("");
    helperNumberRef.current?.focus();
  }

  function handleNumberEntryNumberChange(value: string) {
    const normalized = value.replace(/\D/g, "").slice(0, 3);
    const allowedKeys = new Set(getNumberEntryOptions(normalized).map((item) => item.key));

    setNumberEntryNumber(normalized);
    setNumberEntryError("");
    setNumberEntryAmounts((current) =>
      Object.fromEntries(Object.entries(current).filter(([key]) => allowedKeys.has(key))),
    );
  }

  function addNumberEntryLines() {
    const number = numberEntryNumber.replace(/\D/g, "").slice(0, 3);
    const options = getNumberEntryOptions(number);

    if (number.length < 1 || number.length > 3 || options.length === 0) {
      setNumberEntryError("กรุณาระบุเลข 1 ถึง 3 หลัก");
      return;
    }

    const consumedKeys = new Set<string>();
    const generated: LocalLine[] = [];

    if (number.length === 2) {
      const topAmount = getPositiveAmount(numberEntryAmounts.TWO_TOP);
      const todAmount = getPositiveAmount(numberEntryAmounts.TWO_TOD);

      if (topAmount && todAmount) {
        const sharedSource = `บ:${number}=${topAmount}*${todAmount}`;
        generated.push(createNumberEntryLine(BetType.TWO_TOP, number, topAmount, sharedSource));
        generated.push(createNumberEntryLine(BetType.TWO_TOP, number, todAmount, sharedSource, "TWO_TOD"));
        consumedKeys.add("TWO_TOP");
        consumedKeys.add("TWO_TOD");
      }
    }

    if (number.length === 3) {
      const topAmount = getPositiveAmount(numberEntryAmounts.THREE_TOP);
      const todAmount = getPositiveAmount(numberEntryAmounts.THREE_TOD);

      if (topAmount && todAmount) {
        const sharedSource = `บ:${number}=${topAmount}*${todAmount}`;
        generated.push(createNumberEntryLine(BetType.THREE_STRAIGHT, number, topAmount, sharedSource));
        generated.push(createNumberEntryLine(BetType.THREE_TOD, number, todAmount, sharedSource));
        consumedKeys.add("THREE_TOP");
        consumedKeys.add("THREE_TOD");
      }
    }

    for (const option of options) {
      if (consumedKeys.has(option.key)) {
        continue;
      }

      const amount = getPositiveAmount(numberEntryAmounts[option.key]);
      if (!amount) {
        continue;
      }

      generated.push(...option.buildLines(number, amount));
    }

    if (generated.length === 0) {
      setNumberEntryError("กรุณากรอกจำนวนเงินอย่างน้อย 1 รายการ");
      return;
    }

    setNumberEntryError("");
    setPreviewLines(generated);
    setLines((current) => [...current, ...generated]);
    setPreviewOpen(true);
    setNumberEntryAmounts({});
    setNumberEntryNumber("");
    numberEntryInputRef.current?.focus();
  }

  function removeLine(index: number) {
    setLines((current) => current.filter((_, lineIndex) => lineIndex !== index));
  }

  return (
    <div className="legacy-grid-2">
      <div className="space-y-5">
        <form action={action} className="space-y-5">
          {mode === "edit" ? <input name="ticketId" type="hidden" value={ticketId ?? ""} /> : null}
          <input name="entryMode" type="hidden" value={entryMode} />
          <input
            name="linesJson"
            type="hidden"
            value={JSON.stringify(lines.map(({ betType, displayType, number, amount }) => ({ betType, displayType, number, amount })))}
          />

          <div className="panel">
            <div className="panel-header">
              <h2 className="text-lg font-medium">ข้อมูลการคีย์โพย</h2>
            </div>
            <div className="panel-body">
              <div className="grid gap-4 md:grid-cols-2">
                {mode === "edit" ? (
                  <div>
                    <input name="drawId" type="hidden" value={selectedDrawId} />
                    <div className="legacy-form-label">งวด</div>
                    <div className="legacy-form-control bg-muted/40">{selectedDraw?.name ?? "-"}</div>
                  </div>
                ) : (
                  <div>
                    <label className="legacy-form-label" htmlFor="drawId">
                      งวด
                    </label>
                    <SearchableSelect
                      id="drawId"
                      name="drawId"
                      onChange={setSelectedDrawId}
                      options={drawOptions}
                      required
                      searchPlaceholder="ค้นหางวด"
                      value={selectedDrawId}
                    />
                  </div>
                )}

                {mode === "edit" ? (
                  <div>
                    <input name="customerId" type="hidden" value={selectedCustomerId} />
                    <div className="legacy-form-label">ลูกค้า</div>
                    <div className="legacy-form-control bg-muted/40">{selectedCustomer?.name ?? "-"}</div>
                  </div>
                ) : role !== "CUSTOMER" ? (
                  <div>
                    <label className="legacy-form-label" htmlFor="customerId">
                      ลูกค้า
                    </label>
                    <SearchableSelect
                      id="customerId"
                      name="customerId"
                      onChange={setSelectedCustomerId}
                      options={customerOptions}
                      required
                      searchPlaceholder="ค้นหาลูกค้า"
                      value={selectedCustomerId}
                    />
                  </div>
                ) : (
                  <input name="customerId" type="hidden" value={defaultCustomerId ?? ""} />
                )}
              </div>
            </div>
          </div>
          {!isCustomerRole ? (
            <div className="panel">
              <div className="panel-header">
                <h2 className="text-lg font-medium">เลือกโหมดคีย์</h2>
              </div>
              <div className="panel-body space-y-4">
                <div className="grid gap-3 md:grid-cols-4">
                  {availableEntryModeOptions.map((option) => (
                    <button
                      key={option.key}
                      className={`rounded-sm border px-4 py-3 text-left transition ${
                        entryMode === option.key
                          ? "border-primary bg-primary/10 text-primary shadow-sm"
                          : "border-border bg-background hover:border-primary/40 hover:bg-muted/40"
                      }`}
                      onClick={() => setEntryMode(option.key)}
                      type="button"
                    >
                      <div className="text-sm font-medium">{option.label}</div>
                    </button>
                  ))}
                  <button
                    hidden
                    className={`rounded-sm border px-4 py-3 text-left transition ${
                      entryMode === "NUMBER"
                        ? "border-primary bg-primary/10 text-primary shadow-sm"
                        : "border-border bg-background hover:border-primary/40 hover:bg-muted/40"
                    }`}
                    onClick={() => setEntryMode("NUMBER")}
                    type="button"
                  >
                    <div className="text-sm font-medium">ระบุตัวเลข</div>
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          {entryMode === "HELPER" ? (
          <div className="panel">
            <div className="panel-header">
              <h2 className="text-lg font-medium">Tool ช่วยคีย์</h2>
            </div>
            <div className="panel-body space-y-4">
              <div className="flex flex-wrap gap-2">
                {helperTypes.map((type) => (
                  <Button
                    key={type.key}
                    onClick={() => {
                      setHelperType(type.key);
                      setHelperNumber((current) => normalizeHelperNumber(current, type.key));
                      setHelperError("");
                      helperNumberRef.current?.focus();
                    }}
                    type="button"
                    variant={helperType === type.key ? "secondary" : "outline"}
                  >
                    {type.label}
                  </Button>
                ))}
              </div>

              <div className="grid gap-3 lg:grid-cols-[180px_minmax(0,1fr)_220px_auto]">
                <div className="flex items-center rounded-sm border border-border bg-muted/30 px-4 text-sm font-medium">
                  {helperConfig.label}
                </div>
                <Input
                  ref={helperNumberRef}
                  inputMode="numeric"
                  maxLength={helperConfig.digits}
                  placeholder={`เลข ${helperConfig.digits} หลัก`}
                  value={helperNumber}
                  onChange={(event) => {
                    setHelperNumber(normalizeHelperNumber(event.target.value, helperType));
                    setHelperError("");
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      addHelperLine();
                    }
                  }}
                />
                <Input
                  inputMode="decimal"
                  placeholder="จำนวนเงิน"
                  value={helperAmount}
                  onChange={(event) => {
                    setHelperAmount(event.target.value);
                    setHelperError("");
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      addHelperLine();
                    }
                  }}
                />
                <Button onClick={addHelperLine} type="button">
                  เพิ่มเข้าโพย
                </Button>
              </div>

              <div className="flex flex-wrap gap-2">
                {helperAmountPresets.map((preset) => (
                  <Button
                    key={preset}
                    onClick={() => {
                      setHelperAmount(String(preset));
                      setHelperError("");
                      helperNumberRef.current?.focus();
                    }}
                    type="button"
                    variant={helperAmount === String(preset) ? "secondary" : "outline"}
                  >
                    {formatCurrency(preset)}
                  </Button>
                ))}
              </div>

              <div className="rounded-sm border border-border bg-muted/40 px-4 py-3 text-xs leading-6 text-muted-foreground">
                <div>{helperPreview || "-"}</div>
              </div>

              {helperError ? (
                <div className="rounded-sm border border-[#ebccd1] bg-[#f2dede] px-4 py-3 text-sm text-[#a94442]">
                  {helperError}
                </div>
              ) : null}
            </div>
          </div>
          ) : null}

          {entryMode === "NUMBER" ? (
          <div className="panel">
            <div className="panel-header">
              <h2 className="text-lg font-medium">ระบุตัวเลข</h2>
            </div>
            <div className="panel-body space-y-4">
              <Input
                ref={numberEntryInputRef}
                className="text-center text-2xl font-medium"
                inputMode="numeric"
                maxLength={3}
                type="number"
                placeholder="ระบุตัวเลข"
                value={numberEntryNumber}
                onChange={(event) => handleNumberEntryNumberChange(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addNumberEntryLines();
                  }
                }}
              />

              {numberEntryOptions.length > 0 ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 items-center gap-3 text-center text-base font-medium md:grid-cols-[minmax(0,1fr)_180px] md:text-lg">
                    <div>ประเภท</div>
                    <div>จำนวนเงิน</div>
                  </div>

                  <div className="space-y-3">
                    {numberEntryOptions.map((option) => (
                      <div key={option.key} className="grid grid-cols-2 gap-3 md:grid-cols-[minmax(0,1fr)_180px]">
                        <div
                          className={`flex items-center justify-center rounded-sm border px-4 py-3 text-center text-sm font-medium transition ${
                            numberEntryAmounts[option.key]
                              ? "border-[#86d19f] bg-[#ecfff2] text-[#1f6f43]"
                              : "border-border bg-muted/30"
                          }`}
                        >
                          {option.label}
                        </div>
                        <Input
                          className={
                            numberEntryAmounts[option.key]
                              ? "border-[#86d19f] bg-[#f7fff9] text-[#1f6f43]"
                              : undefined
                          }
                          inputMode="decimal"
                          type="number"
                          placeholder="ระบุจำนวนเงิน"
                          value={numberEntryAmounts[option.key] ?? ""}
                          onChange={(event) => {
                            setNumberEntryAmounts((current) => ({
                              ...current,
                              [option.key]: sanitizeDecimalInput(event.target.value),
                            }));
                            setNumberEntryError("");
                          }}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              event.preventDefault();
                              addNumberEntryLines();
                            }
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="rounded-sm border border-dashed border-border bg-muted/20 px-4 py-5 text-center text-sm text-muted-foreground">
                  กรอกเลข 1, 2 หรือ 3 หลัก เพื่อเลือกรูปแบบการซื้อ
                </div>
              )}

              <div className="flex flex-wrap items-center gap-3">
                <Button className="w-full justify-center" onClick={addNumberEntryLines} type="button">
                  เพิ่มรายการ
                </Button>
              </div>

              {numberEntryError ? (
                <div className="rounded-sm border border-[#ebccd1] bg-[#f2dede] px-4 py-3 text-sm text-[#a94442]">
                  {numberEntryError}
                </div>
              ) : null}
            </div>
          </div>
          ) : null}

          {entryMode === "QUICK" ? (
          <div className="panel">
            <div className="panel-header">
              <Button className="order-2 shrink-0" onClick={() => setQuickHelpOpen(true)} size="sm" type="button" variant="outline">
                วิธีกรอก
              </Button>
              <h2 className="text-lg font-medium">คีย์ลัดแบบเร็ว</h2>
            </div>
            <div className="panel-body space-y-4">
              <div className="flex flex-wrap gap-2">
                {(Object.keys(quickModeLabels) as QuickEntryMode[]).map((mode) => (
                  <Button
                    key={mode}
                    onClick={() => {
                      setQuickMode(mode);
                      setQuickError("");
                    }}
                    type="button"
                    variant={quickMode === mode ? "secondary" : "outline"}
                  >
                    {quickModeLabels[mode]}
                  </Button>
                ))}
              </div>

              <Textarea
                id="quick-ticket-input"
                placeholder={quickModePlaceholders[quickMode]}
                rows={8}
                value={quickText}
                onChange={(event) => setQuickText(event.target.value)}
                onKeyDown={(event) => {
                  if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
                    event.preventDefault();
                    parseQuickInput();
                  }
                }}
              />

              <div className="flex flex-wrap items-center gap-3">
                <Button onClick={parseQuickInput} type="button">
                  แปลงคีย์ลัด
                </Button>
              </div>

              {quickError ? (
                <div className="rounded-sm border border-[#ebccd1] bg-[#f2dede] px-4 py-3 text-sm text-[#a94442]">
                  {quickError}
                </div>
              ) : null}
            </div>
          </div>
          ) : null}

          {entryMode === "PHP" ? (
          <div className="panel">
            <div className="panel-header">
              <Button className="order-2 shrink-0" onClick={() => setPhpHelpOpen(true)} size="sm" type="button" variant="outline">
                วิธีกรอก
              </Button>
              <h2 className="text-lg font-medium">คีย์ตามฟอร์แมต PHP</h2>
            </div>
            <div className="panel-body space-y-4">
              <Textarea
                id="legacy-ticket-input"
                placeholder={"บ:00=200\nล:01=200*200\nบ:001*=150\nบ:103=500*500\nล:080=200\nบ:24=*200\nบ:5=5000\nล:6=500"}
                rows={12}
                value={rawText}
                onChange={(event) => setRawText(event.target.value)}
              />

              <div className="flex flex-wrap items-center gap-3">
                <Button onClick={parseLegacyInput} type="button" variant="secondary">
                  ตรวจสอบและแยกรายการ
                </Button>
              </div>

              <div className="hidden">
                <Button onClick={() => setPhpHelpOpen(true)} type="button" variant="outline">
                  วิธีกรอก
                </Button>
              </div>

              {parseError ? (
                <div className="rounded-sm border border-[#ebccd1] bg-[#f2dede] px-4 py-3 text-sm text-[#a94442]">
                  {parseError}
                </div>
              ) : null}
            </div>
          </div>
          ) : null}

          <div className="panel">
            <div className="panel-header">
              <h2 className="text-lg font-medium">รายการในโพย</h2>
            </div>
            <div className="panel-body">
              <div className="table-shell">
                <table>
                  <thead>
                    <tr>
                      <th>ประเภท</th>
                      <th>เลข</th>
                      <th>ยอดเงิน</th>
                      <th>ข้อมูลการคีย์</th>
                      <th>จัดการ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.length === 0 ? (
                      <tr>
                        <td colSpan={5}>ยังไม่มีรายการในโพยนี้</td>
                      </tr>
                    ) : (
                      lines.map((line, index) => (
                        <tr key={`${line.displayType}-${line.number}-${index}`}>
                          <td>{displayTypeLabels[line.displayType] ?? betTypeLabels[line.betType]}</td>
                          <td className="font-mono text-base">{line.number}</td>
                          <td>{formatCurrency(line.amount)}</td>
                          <td className="font-mono text-xs">{line.source}</td>
                          <td>
                            <button className="legacy-btn-danger px-2 py-1" onClick={() => removeLine(index)} type="button">
                              <Trash2 className="size-4" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
                {ticketListSummary.length > 0 ? (
                  <div className="border-t border-[#e2e8f0] bg-[linear-gradient(180deg,#fbfdff_0%,#f8fbff_100%)] px-4 py-4">
                    <div className="mb-3 text-sm font-semibold text-[#42526b]">สรุปรายการในโพย</div>
                    <div className="space-y-2 text-sm">
                      {ticketListSummary.map((item) => (
                        <div key={item.key} className="flex items-center justify-between gap-3 rounded-sm border border-[#e8eef5] bg-white px-3 py-2">
                          <div className="min-w-0">
                            <div className="font-medium">{item.label}</div>
                            <div className="text-xs text-muted-foreground">{item.count} รายการ</div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-muted-foreground">ราคารวม</div>
                            <div className="font-semibold">{formatCurrency(item.totalAmount)}</div>
                          </div>
                        </div>
                      ))}
                      <div className="flex items-center justify-between rounded-sm border border-[#d7e3f5] bg-[#eef5ff] px-3 py-3 font-semibold text-[#1d4ed8]">
                        <div>รวมทั้งหมด</div>
                        <div className="text-right">
                          <div className="text-xs font-medium text-[#4b6cb7]">ราคารวม</div>
                          <div>{formatCurrency(totals.subtotal)}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div className="panel">
            <div className="panel-header">
              <h2 className="text-lg font-medium">หมายเหตุ</h2>
            </div>
            <div className="panel-body">
              <Textarea defaultValue={initialNote ?? ""} id="note" name="note" placeholder="หมายเหตุเพิ่มเติมในบิล" />
            </div>
          </div>

          <div className="flex justify-end">
            <FormSubmit
              idleLabel={mode === "edit" ? "ยืนยันแก้ไขโพย" : "ยืนยันบันทึกโพย"}
              pendingLabel={mode === "edit" ? "กำลังแก้ไขโพย..." : "กำลังบันทึกโพย..."}
            />
          </div>
        </form>
      </div>

      <div className="space-y-5">
        <div className="panel">
          <div className="panel-header">
            <h2 className="text-lg font-medium">สรุปโพย</h2>
          </div>
          <div className="panel-body space-y-3">
            <div>
              <div className="text-sm font-medium">งวด</div>
              <div className="text-sm text-muted-foreground">{selectedDraw?.name ?? "-"}</div>
            </div>
            <div>
              <div className="text-sm font-medium">ลูกค้า</div>
              <div className="text-sm text-muted-foreground">
                {selectedCustomer?.name ?? "-"}
              </div>
            </div>
            <div>
              <div className="text-sm font-medium">ปิดรับโพย</div>
              <div className="text-sm text-muted-foreground">
                {selectedDraw?.closeAt ? new Date(selectedDraw.closeAt).toLocaleString("th-TH") : "-"}
              </div>
            </div>
            <hr className="soft-divider" />
            <div className="flex items-center justify-between text-sm">
              <span>ยอดแทงรวม</span>
              <strong>{formatCurrency(totals.subtotal)}</strong>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>ส่วนลดรวม</span>
              <strong>{formatCurrency(totals.discount)}</strong>
            </div>
            <div className="flex items-center justify-between text-base">
              <span>สุทธิ</span>
              <strong className="text-primary">{formatCurrency(totals.total)}</strong>
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <h2 className="text-lg font-medium">อัตราจ่ายและส่วนลด</h2>
          </div>
          <div className="panel-body space-y-2">
            {pricingRows.map((row) => {
              const rate = { payout: row.payout, isOpen: row.isOpen };
              const commission = row.commission;

              return (
                <div key={row.key} className="flex items-center justify-between border-b border-border pb-2 last:border-b-0 last:pb-0">
                  <div>
                    <div className="font-medium">{row.label}</div>
                    <div className="text-xs text-muted-foreground">
                      จ่าย {rate.payout} / ส่วนลด {commission}%
                    </div>
                  </div>
                  <span className={rate.isOpen ? "pill bg-accent text-accent-foreground" : "pill bg-muted text-muted-foreground"}>
                    {rate.isOpen ? "เปิด" : "ปิด"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <LegacyModal
        footer={
          <div className="legacy-modal-actions">
            <button className="legacy-btn-default" onClick={() => setPreviewOpen(false)} type="button">
              ปิด
            </button>
          </div>
        }
        onClose={() => setPreviewOpen(false)}
        open={previewOpen}
        size="lg"
        title="พรีวิวรายการ"
      >
        <div className="space-y-5">
          {previewGroups.map((group: PreviewGroup) => (
            <div key={group.key}>
              <h5 className="mb-3 text-base font-medium">{group.label}</h5>
              <table className="legacy-period-table">
                <thead>
                  <tr>
                    <th>เลข</th>
                    <th>ยอดเงิน</th>
                    <th>ข้อมูลการคีย์</th>
                  </tr>
                </thead>
                <tbody>
                  {group.items.map((item, index) => (
                    <tr key={`${group.key}-${item.number}-${index}`}>
                      <td className="font-mono">{item.number}</td>
                      <td>{formatCurrency(item.amount)}</td>
                      <td className="font-mono text-xs">{item.source}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      </LegacyModal>

      <LegacyModal
        footer={
          <div className="legacy-modal-actions">
            <button className="legacy-btn-default" onClick={() => setQuickHelpOpen(false)} type="button">
              ปิด
            </button>
          </div>
        }
        onClose={() => setQuickHelpOpen(false)}
        open={quickHelpOpen}
        size="lg"
        title="วิธีกรอกคีย์ลัดแบบเร็ว"
      >
        <div className="space-y-5">
          <p className="text-sm text-muted-foreground">
            คีย์ได้หลายบรรทัดโดยไม่ต้องใส่ <span className="font-mono">บ:</span> หรือ <span className="font-mono">ล:</span> และให้เลือกโหมดด้านบนให้ตรงกับรูปแบบที่ต้องการ
          </p>
          {quickFormatExamples.map((section) => (
            <div key={section.title} className="space-y-3">
              <h5 className="text-base font-medium">{section.title}</h5>
              <div className="overflow-hidden rounded-sm border border-border">
                <table className="legacy-period-table">
                  <thead>
                    <tr>
                      <th>ตัวอย่าง</th>
                      <th>ความหมาย</th>
                    </tr>
                  </thead>
                  <tbody>
                    {section.items.map((item) => (
                      <tr key={`${section.title}-${item.code}`}>
                        <td className="font-mono text-xs">{item.code}</td>
                        <td>{item.meaning}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      </LegacyModal>

      <LegacyModal
        footer={
          <div className="legacy-modal-actions">
            <button className="legacy-btn-default" onClick={() => setPhpHelpOpen(false)} type="button">
              ปิด
            </button>
          </div>
        }
        onClose={() => setPhpHelpOpen(false)}
        open={phpHelpOpen}
        size="lg"
        title="วิธีกรอกฟอร์แมต PHP"
      >
        <div className="space-y-5">
          <p className="text-sm text-muted-foreground">
            ใส่ได้หลายบรรทัด โดยขึ้นต้นด้วย <span className="font-mono">บ:</span>, <span className="font-mono">ล:</span> หรือ <span className="font-mono">บล:</span>
          </p>
          {phpFormatExamples.map((section) => (
            <div key={section.title} className="space-y-3">
              <h5 className="text-base font-medium">{section.title}</h5>
              <div className="overflow-hidden rounded-sm border border-border">
                <table className="legacy-period-table">
                  <thead>
                    <tr>
                      <th>ตัวอย่าง</th>
                      <th>ความหมาย</th>
                    </tr>
                  </thead>
                  <tbody>
                    {section.items.map((item) => (
                      <tr key={`${section.title}-${item.code}`}>
                        <td className="font-mono text-xs">{item.code}</td>
                        <td>{item.meaning}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      </LegacyModal>
    </div>
  );
}
