"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { BetType, Role } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { FormSubmit } from "@/components/ui/form-submit";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createTicketAction, type TicketActionState } from "@/lib/actions/tickets";
import { showErrorAlert, showSuccessAlert } from "@/lib/client-alerts";
import { betTypeDigits, betTypeLabels, betTypeOrder } from "@/lib/constants";
import { compatSettingsToCommissionEntries, type UserCompatSettings } from "@/lib/php-compat-shared";
import { parseQuickEntry, type ParsedQuickLine, type QuickEntryMode } from "@/lib/quick-entry";
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
  code: string;
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
};

type LocalLine = {
  betType: BetType;
  number: string;
  amount: number;
};

const initialState: TicketActionState = {};

export function TicketEntry({
  draws,
  customers,
  commissionProfiles,
  customerSettings,
  role,
  defaultCustomerId,
  defaultDrawId,
}: TicketEntryProps) {
  const router = useRouter();
  const [state, action] = useActionState(createTicketAction, initialState);
  const [selectedDrawId, setSelectedDrawId] = useState(defaultDrawId ?? draws[0]?.id ?? "");
  const [selectedCustomerId, setSelectedCustomerId] = useState(defaultCustomerId ?? customers[0]?.id ?? "");
  const [betType, setBetType] = useState<BetType>(BetType.TWO_TOP);
  const [number, setNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [lines, setLines] = useState<LocalLine[]>([]);
  const [quickMode, setQuickMode] = useState<QuickEntryMode>("TOP");
  const [quickText, setQuickText] = useState("");
  const [quickError, setQuickError] = useState("");

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

  function addLine() {
    const expectedDigits = betTypeDigits[betType];
    const normalizedNumber = number.replace(/\D/g, "").slice(0, expectedDigits);
    const parsedAmount = Number(amount);

    if (normalizedNumber.length !== expectedDigits || !Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      return;
    }

    setLines((current) => [...current, { betType, number: normalizedNumber, amount: parsedAmount }]);
    setNumber("");
    setAmount("");
  }

  function mergeLines(parsedLines: ParsedQuickLine[]) {
    setLines((current) => {
      const merged = new Map<string, LocalLine>();

      for (const item of current) {
        merged.set(`${item.betType}:${item.number}`, item);
      }

      for (const item of parsedLines) {
        const key = `${item.betType}:${item.number}`;
        const existing = merged.get(key);
        merged.set(
          key,
          existing
            ? { ...existing, amount: existing.amount + item.amount }
            : { betType: item.betType, number: item.number, amount: item.amount },
        );
      }

      return [...merged.values()];
    });
  }

  function addQuickLines() {
    const parsed = parseQuickEntry(quickMode, quickText);

    if ("error" in parsed) {
      setQuickError(parsed.error);
      return;
    }

    setQuickError("");
    mergeLines(parsed.lines);
    setQuickText("");
  }

  function removeLine(index: number) {
    setLines((current) => current.filter((_, lineIndex) => lineIndex !== index));
  }

  return (
    <div className="legacy-grid-2">
      <div className="space-y-5">
        <form action={action} className="space-y-5">
          <input name="linesJson" type="hidden" value={JSON.stringify(lines)} />

          <div className="panel">
            <div className="panel-header">
              <h2 className="text-lg font-medium">ข้อมูลการคีย์โพย</h2>
            </div>
            <div className="panel-body">
              <div className="grid gap-4 md:grid-cols-2">
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

                {role !== "CUSTOMER" ? (
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
                          {customer.code} : {customer.name}
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

          <div className="panel panel-info">
            <div className="panel-header">
              <h2 className="text-lg font-medium">เพิ่มรายการทีละบรรทัด</h2>
            </div>
            <div className="panel-body">
              <div className="grid gap-3 md:grid-cols-[1.2fr_0.8fr_0.8fr_auto]">
                <Select value={betType} onChange={(event) => setBetType(event.target.value as BetType)}>
                  {betTypeOrder.map((item) => (
                    <option key={item} value={item}>
                      {betTypeLabels[item]}
                    </option>
                  ))}
                </Select>
                <Input inputMode="numeric" maxLength={betTypeDigits[betType]} placeholder={`เลข ${betTypeDigits[betType]} หลัก`} value={number} onChange={(event) => setNumber(event.target.value)} />
                <Input inputMode="decimal" min={1} placeholder="จำนวนเงิน" type="number" value={amount} onChange={(event) => setAmount(event.target.value)} />
                <Button className="w-full md:w-auto" onClick={addLine} type="button">
                  เพิ่ม
                </Button>
              </div>
            </div>
          </div>

          <div className="panel">
            <div className="panel-header">
              <div>
                <h2 className="text-lg font-medium">คีย์ลัดแบบข้อความ</h2>
                <p className="text-xs text-muted-foreground">อิง flow จาก `member_adddata.php`</p>
              </div>
            </div>
            <div className="panel-body space-y-3">
              <div className="flex flex-wrap gap-2">
                <button className={quickMode === "TOP" ? "legacy-btn-primary" : "legacy-btn-default"} onClick={() => setQuickMode("TOP")} type="button">บน</button>
                <button className={quickMode === "BOTTOM" ? "legacy-btn-primary" : "legacy-btn-default"} onClick={() => setQuickMode("BOTTOM")} type="button">ล่าง</button>
                <button className={quickMode === "MIXED" ? "legacy-btn-primary" : "legacy-btn-default"} onClick={() => setQuickMode("MIXED")} type="button">บน + ล่าง</button>
              </div>

              <Textarea
                placeholder={
                  quickMode === "TOP"
                    ? "เช่น\n1=100\n12=100\n123=100\n123*50\n123=100*50\n123*=10\n5=19*10"
                    : quickMode === "BOTTOM"
                      ? "เช่น\n4=100\n45=100\n45=100/50\n456=100\n456*=10\n5=19*10"
                      : "เช่น\n12=100\n12=100/50\n123=100\n123=100/50\n123=100*50/30\n123*=10"
                }
                value={quickText}
                onChange={(event) => setQuickText(event.target.value)}
              />

              <div className="flex flex-wrap items-center gap-3">
                <Button onClick={addQuickLines} type="button" variant="secondary">
                  แปลงเป็นรายการ
                </Button>
                <span className="text-xs text-muted-foreground">รองรับรูปแบบคีย์ลัดหลักของระบบเดิมในชุดที่ schema ปัจจุบันรองรับ</span>
              </div>

              {quickError ? (
                <div className="rounded-sm border border-[#ebccd1] bg-[#f2dede] px-4 py-3 text-sm text-[#a94442]">
                  {quickError}
                </div>
              ) : null}
            </div>
          </div>

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
                      <th>จำนวนเงิน</th>
                      <th>จัดการ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.length === 0 ? (
                      <tr>
                        <td colSpan={4}>ยังไม่มีรายการในโพยนี้</td>
                      </tr>
                    ) : (
                      lines.map((line, index) => (
                        <tr key={`${line.betType}-${line.number}-${index}`}>
                          <td>{betTypeLabels[line.betType]}</td>
                          <td className="font-mono text-base">{line.number}</td>
                          <td>{formatCurrency(line.amount)}</td>
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
              <Textarea id="note" name="note" placeholder="หมายเหตุเพิ่มเติมในบิล" />
            </div>
          </div>

          <div className="flex justify-end">
            <FormSubmit idleLabel="ยืนยันบันทึกโพย" pendingLabel="กำลังบันทึกโพย..." />
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
                {selectedCustomer ? `${selectedCustomer.code} : ${selectedCustomer.name}` : "-"}
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
    </div>
  );
}
