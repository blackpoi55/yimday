"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { BetType, Role } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { FormSubmit } from "@/components/ui/form-submit";
import { LegacyModal } from "@/components/ui/legacy-modal";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createTicketAction, type TicketActionState } from "@/lib/actions/tickets";
import { showErrorAlert, showSuccessAlert } from "@/lib/client-alerts";
import { betTypeLabels } from "@/lib/constants";
import { compatSettingsToCommissionEntries, type UserCompatSettings } from "@/lib/php-compat-shared";
import { parsePhpTicketInput, type LegacyDisplayType, type ParsedPhpTicketLine } from "@/lib/php-ticket-parser";
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
}: TicketEntryProps) {
  const router = useRouter();
  const [state, action] = useActionState(createTicketAction, initialState);
  const [selectedDrawId, setSelectedDrawId] = useState(defaultDrawId ?? draws[0]?.id ?? "");
  const [selectedCustomerId, setSelectedCustomerId] = useState(defaultCustomerId ?? customers[0]?.id ?? "");
  const [rawText, setRawText] = useState("");
  const [parseError, setParseError] = useState("");
  const [lines, setLines] = useState<LocalLine[]>([]);
  const [previewOpen, setPreviewOpen] = useState(false);

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

  function removeLine(index: number) {
    setLines((current) => current.filter((_, lineIndex) => lineIndex !== index));
  }

  return (
    <div className="legacy-grid-2">
      <div className="space-y-5">
        <form action={action} className="space-y-5">
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

          <div className="panel">
            <div className="panel-header">
              <div>
                <h2 className="text-lg font-medium">คีย์ตามฟอร์แมต PHP</h2>
                <p className="text-xs text-muted-foreground">ใช้รูปแบบ `บ:` `ล:` หรือ `บล:` แล้วตรวจสอบก่อนบันทึก</p>
              </div>
            </div>
            <div className="panel-body space-y-4">
              <Textarea
                id="legacy-ticket-input"
                placeholder={"บ:00=200\nล:01=200*200\nบ:001*=150\nบ:103=500*500\nล:080=200\nบ:24=*200\nบ:5=5000\nล:6=500"}
                rows={12}
                value={rawText}
                onChange={(event) => setRawText(event.target.value)}
              />

              <div className="rounded-sm border border-border bg-muted/40 px-4 py-3 text-xs leading-6 text-muted-foreground">
                <div>`บ:00=200` = 2 ตัวบน</div>
                <div>`ล:01=200*200` = 2 ตัวล่าง + กลับเลข</div>
                <div>`บ:001*=150` = 3 ตัวบนสลับ</div>
                <div>`บ:103=500*500` = 3 ตัวบน + 3 โต๊ด</div>
                <div>`บ:24=*200` = คู่โต๊ด</div>
                <div>`บ:5=5000` = ลอยบน, `ล:6=500` = ลอยล่าง</div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Button onClick={parseLegacyInput} type="button" variant="secondary">
                  ตรวจสอบและแยกรายการ
                </Button>
                <span className="text-xs text-muted-foreground">หลังตรวจสอบแล้วระบบจะใช้รายการนี้เป็นชุดสำหรับบันทึกโพย</span>
              </div>

              {parseError ? (
                <div className="rounded-sm border border-[#ebccd1] bg-[#f2dede] px-4 py-3 text-sm text-[#a94442]">
                  {parseError}
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
        title="พรีวิวรายการคีย์ตามฟอร์แมต PHP"
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
