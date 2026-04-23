"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { BetType, Role } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { FormSubmit } from "@/components/ui/form-submit";
import { Input } from "@/components/ui/input";
import { LegacyModal } from "@/components/ui/legacy-modal";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createTicketAction, updateTicketAction, type TicketActionState } from "@/lib/actions/tickets";
import { showErrorAlert, showSuccessAlert } from "@/lib/client-alerts";
import { betTypeLabels } from "@/lib/constants";
import { compatSettingsToCommissionEntries, type UserCompatSettings } from "@/lib/php-compat-shared";
import { parsePhpTicketInput, type LegacyDisplayType, type ParsedPhpTicketLine } from "@/lib/php-ticket-parser";
import { parseQuickEntry, type QuickEntryMode } from "@/lib/quick-entry";
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

type EntryMode = "HELPER" | "QUICK" | "PHP";

const entryModeOptions: Array<{
  key: EntryMode;
  label: string;
}> = [
  { key: "HELPER", label: "Tool ช่วยคีย์" },
  { key: "QUICK", label: "คีย์ลัดแบบเร็ว" },
  { key: "PHP", label: "ฟอร์แมต PHP" },
];

function sortDigits(value: string) {
  return value.split("").sort().join("");
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
  const router = useRouter();
  const [state, action] = useActionState(mode === "edit" ? updateTicketAction : createTicketAction, initialState);
  const [selectedDrawId, setSelectedDrawId] = useState(defaultDrawId ?? draws[0]?.id ?? "");
  const [selectedCustomerId, setSelectedCustomerId] = useState(defaultCustomerId ?? customers[0]?.id ?? "");
  const [entryMode, setEntryMode] = useState<EntryMode>("HELPER");
  const [helperType, setHelperType] = useState<LegacyDisplayType>("TWO_TOP");
  const [helperNumber, setHelperNumber] = useState("");
  const [helperAmount, setHelperAmount] = useState("");
  const [helperError, setHelperError] = useState("");
  const [quickMode, setQuickMode] = useState<QuickEntryMode>("TOP");
  const [quickText, setQuickText] = useState("");
  const [quickError, setQuickError] = useState("");
  const [rawText, setRawText] = useState("");
  const [parseError, setParseError] = useState("");
  const [lines, setLines] = useState<LocalLine[]>(initialLines);
  const [previewOpen, setPreviewOpen] = useState(false);
  const helperNumberRef = useRef<HTMLInputElement | null>(null);

  const selectedDraw = useMemo(
    () => draws.find((draw) => draw.id === selectedDrawId) ?? draws[0],
    [draws, selectedDrawId],
  );
  const selectedRates = useMemo(() => selectedDraw?.rates ?? [], [selectedDraw]);
  const selectedCustomer = customers.find((customer) => customer.id === selectedCustomerId) ?? customers[0];

  const commissionMap = useMemo(() => {
    const map = new Map<BetType, number>();

    for (const rate of selectedRates) {
      map.set(rate.betType, rate.commission);
    }

    for (const item of commissionProfiles) {
      if (item.role === (selectedCustomer?.role ?? Role.CUSTOMER)) {
        map.set(item.betType, item.commission);
      }
    }

    if (selectedCustomer) {
      for (const item of compatSettingsToCommissionEntries(customerSettings[selectedCustomer.id], selectedCustomer.role)) {
        map.set(item.betType, item.commission);
      }
    }

    return map;
  }, [commissionProfiles, customerSettings, selectedCustomer, selectedRates]);

  const totals = useMemo(() => {
    const subtotal = lines.reduce((sum, line) => sum + line.amount, 0);
    const discount = lines.reduce((sum, line) => {
      const commission = commissionMap.get(line.betType) ?? 0;
      return sum + (line.amount * commission) / 100;
    }, 0);

    return {
      subtotal,
      discount,
      total: subtotal - discount,
    };
  }, [commissionMap, lines]);

  const previewGroups = useMemo(() => buildPreviewGroups(lines), [lines]);
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

  useEffect(() => {
    if (state.error) {
      void showErrorAlert(state.error, "บันทึกโพยไม่สำเร็จ");
    }
  }, [state.error]);

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
    setLines(parsed.lines);
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
    setLines(parsed.lines.map((line) => ({ ...line, displayType: line.betType })));
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
    setLines((current) => [
      ...current,
      {
        betType: helperConfig.betType,
        displayType: helperType,
        number: normalizedNumber,
        amount,
        source: buildHelperSource(helperType, normalizedNumber, amount),
      },
    ]);
    setHelperNumber("");
    helperNumberRef.current?.focus();
  }

  function removeLine(index: number) {
    setLines((current) => current.filter((_, lineIndex) => lineIndex !== index));
  }

  return (
    <div className="legacy-grid-2">
      <div className="space-y-5">
        <form action={action} className="space-y-5">
          {mode === "edit" ? <input name="ticketId" type="hidden" value={ticketId ?? ""} /> : null}
          <input
            name="linesJson"
            type="hidden"
            value={JSON.stringify(lines.map(({ betType, number, amount }) => ({ betType, number, amount })))}
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
                    <Select id="drawId" name="drawId" value={selectedDrawId} onChange={(event) => setSelectedDrawId(event.target.value)} required>
                      {draws.map((draw) => (
                        <option key={draw.id} value={draw.id}>
                          {draw.name}
                        </option>
                      ))}
                    </Select>
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
                    <Select
                      id="customerId"
                      name="customerId"
                      value={selectedCustomerId}
                      onChange={(event) => setSelectedCustomerId(event.target.value)}
                      required
                    >
                      {customers.map((customer) => (
                        <option key={customer.id} value={customer.id}>
                          {customer.name}
                        </option>
                      ))}
                    </Select>
                  </div>
                ) : (
                  <input name="customerId" type="hidden" value={defaultCustomerId ?? ""} />
                )}
              </div>
            </div>
          </div>
          <div className="panel">
            <div className="panel-header">
              <h2 className="text-lg font-medium">เลือกโหมดคีย์</h2>
            </div>
            <div className="panel-body space-y-4">
              <div className="grid gap-3 md:grid-cols-3">
                {entryModeOptions.map((mode) => (
                  <button
                    key={mode.key}
                    className={`rounded-sm border px-4 py-3 text-left transition ${
                      entryMode === mode.key
                        ? "border-primary bg-primary/10 text-primary shadow-sm"
                        : "border-border bg-background hover:border-primary/40 hover:bg-muted/40"
                    }`}
                    onClick={() => setEntryMode(mode.key)}
                    type="button"
                  >
                    <div className="text-sm font-medium">{mode.label}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

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

          {entryMode === "QUICK" ? (
          <div className="panel">
            <div className="panel-header">
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
            {selectedRates.map((rate) => {
              const commission = commissionMap.get(rate.betType) ?? rate.commission;

              return (
                <div key={rate.betType} className="flex items-center justify-between border-b border-border pb-2 last:border-b-0 last:pb-0">
                  <div>
                    <div className="font-medium">{betTypeLabels[rate.betType]}</div>
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
    </div>
  );
}
