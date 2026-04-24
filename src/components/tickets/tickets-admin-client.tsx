"use client";

import Link from "next/link";
import { useState } from "react";
import { type BetType } from "@prisma/client";
import { Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LegacyModal } from "@/components/ui/legacy-modal";
import { formatLegacyTicketEntry } from "@/lib/legacy-ticket-format";
import { getTicketLineLabel } from "@/lib/ticket-line";
import { formatCurrency } from "@/lib/utils";

type TicketItem = {
  id: string;
  betType: BetType;
  displayType: string | null;
  number: string;
  amount: number;
};

type TicketEntry = {
  id: string;
  code: string;
  displayName: string;
  customerId: string;
  customerName: string;
  entryLabel: string;
  subtotal: number;
  discount: number;
  total: number;
  createdAtLabel: string;
  note: string | null;
  items: TicketItem[];
};

type CustomerSummary = {
  customerId: string;
  customerName: string;
  subtotal: number;
  total: number;
  tickets: TicketEntry[];
};

type DrawSummary = {
  drawId: string;
  drawName: string;
  subtotal: number;
  total: number;
  customers: CustomerSummary[];
};

type TicketsAdminClientProps = {
  draws: DrawSummary[];
};

export function TicketsAdminClient({ draws }: TicketsAdminClientProps) {
  const [activeDrawId, setActiveDrawId] = useState<string | null>(null);
  const [activeCustomerKey, setActiveCustomerKey] = useState<string | null>(null);
  const [activeTicketId, setActiveTicketId] = useState<string | null>(null);

  const activeDraw = draws.find((draw) => draw.drawId === activeDrawId) ?? null;
  const activeCustomer = activeDraw?.customers.find((customer) => `${activeDraw.drawId}:${customer.customerId}` === activeCustomerKey) ?? null;
  const defaultActiveTicket = activeCustomer?.tickets[activeCustomer.tickets.length - 1] ?? null;
  const activeTicket = activeCustomer?.tickets.find((ticket) => ticket.id === activeTicketId) ?? defaultActiveTicket;

  return (
    <>
      <div className="table-shell overflow-visible rounded-none border-0 bg-transparent">
        <table className="legacy-period-table">
          <thead>
            <tr>
              <th>งวดประจำวันที่</th>
              <th>ยอดเงินรับทั้งหมด</th>
              <th>ยอดเงินหลังหัก %</th>
              <th className="w-[5%]">แก้ไข</th>
            </tr>
          </thead>
          <tbody>
            {draws.map((draw) => (
              <tr key={draw.drawId}>
                <td>{draw.drawName}</td>
                <td>{formatCurrency(draw.subtotal)}</td>
                <td>{formatCurrency(draw.total)} ฿</td>
                <td className="text-center">
                  <button className="legacy-btn-success legacy-icon-btn" onClick={() => setActiveDrawId(draw.drawId)} type="button">
                    <Eye className="size-14px" />
                  </button>
                </td>
              </tr>
            ))}
            {draws.length === 0 ? (
              <tr>
                <td colSpan={4}>ยังไม่มีข้อมูลการรับโพย</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <LegacyModal
        open={Boolean(activeDraw)}
        onClose={() => {
          setActiveDrawId(null);
          setActiveCustomerKey(null);
          setActiveTicketId(null);
        }}
        title={activeDraw ? `ข้อมูลการรับโพย \\ งวดประจำวันที่ ${activeDraw.drawName}` : ""}
        size="lg"
      >
        {activeDraw ? (
          <div className="table-shell overflow-visible rounded-none border-0 bg-transparent">
            <table className="legacy-period-table">
              <thead>
                <tr>
                  <th>ลำดับ</th>
                  <th>ชื่อ</th>
                  <th>จำนวนโพย</th>
                  <th>ยอดเงินซื้อทั้งหมด</th>
                  <th>ยอดเงินหลังหัก %</th>
                  <th className="w-[5%]">แก้ไข</th>
                </tr>
              </thead>
              <tbody>
                {activeDraw.customers.map((customer, index) => (
                  <tr key={customer.customerId}>
                    <td>{index + 1}</td>
                    <td>{customer.customerName}</td>
                    <td>{customer.tickets.length}</td>
                    <td>{formatCurrency(customer.subtotal)}</td>
                    <td>{formatCurrency(customer.total)} ฿</td>
                    <td className="text-center">
                      <button
                        className="legacy-btn-success legacy-icon-btn"
                        onClick={() => {
                          setActiveCustomerKey(`${activeDraw.drawId}:${customer.customerId}`);
                          setActiveTicketId(customer.tickets[customer.tickets.length - 1]?.id ?? null);
                        }}
                        type="button"
                      >
                        <Eye className="size-14px" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </LegacyModal>

      <LegacyModal
        open={Boolean(activeDraw && activeCustomer)}
        onClose={() => {
          setActiveCustomerKey(null);
          setActiveTicketId(null);
        }}
        title={activeDraw && activeCustomer ? `ข้อมูลการรับโพย \\ งวดประจำวันที่ ${activeDraw.drawName} \\ ${activeCustomer.customerName}` : ""}
        size="lg"
      >
        {activeDraw && activeCustomer ? (
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
            <div className="space-y-4">
              <div className="panel">
                <div className="panel-header">
                  <div className="text-[18px]">
                    งวดประจำวันที่ {activeDraw.drawName} : {activeTicket?.displayName ?? "-"}
                  </div>
                  {activeTicket ? (
                    <Link href={`/reports/tickets/${activeTicket.id}?print=1`} rel="noreferrer" target="_blank">
                      <Button className="font-semibold shadow-[0_10px_24px_rgba(91,192,222,0.28)] hover:translate-y-[-1px]" variant="secondary">
                        PDF
                      </Button>
                    </Link>
                  ) : null}
                </div>
                <div className="panel-body">
                  {activeTicket ? (
                    <div className="space-y-4">
                      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                        <div className="rounded-2xl border border-[#dbe7f3] bg-[#f8fbff] px-4 py-3">
                          <div className="text-xs font-semibold uppercase tracking-[0.08em] text-[#60758d]">รหัสโพย</div>
                          <div className="mt-1 text-sm font-semibold text-[#0f172a]">{activeTicket.code}</div>
                          <div className="mt-1 text-xs text-[#64748b]">{activeTicket.displayName}</div>
                        </div>
                        <div className="rounded-2xl border border-[#dbe7f3] bg-[#f8fbff] px-4 py-3">
                          <div className="text-xs font-semibold uppercase tracking-[0.08em] text-[#60758d]">ผู้เกี่ยวข้อง</div>
                          <div className="mt-1 text-sm font-semibold text-[#0f172a]">{activeTicket.customerName}</div>
                          <div className="mt-1 text-xs text-[#64748b]">บันทึกโดย {activeTicket.entryLabel}</div>
                        </div>
                        <div className="rounded-2xl border border-[#dbe7f3] bg-[#f8fbff] px-4 py-3">
                          <div className="text-xs font-semibold uppercase tracking-[0.08em] text-[#60758d]">เวลาบันทึก</div>
                          <div className="mt-1 text-sm font-semibold text-[#0f172a]">{activeTicket.createdAtLabel}</div>
                          <div className="mt-1 text-xs text-[#64748b]">{activeTicket.items.length} รายการ</div>
                        </div>
                        <div className="rounded-2xl border border-[#dbe7f3] bg-[#f8fbff] px-4 py-3">
                          <div className="text-xs font-semibold uppercase tracking-[0.08em] text-[#60758d]">ยอดสุทธิ</div>
                          <div className="mt-1 text-sm font-semibold text-[#0f172a]">{formatCurrency(activeTicket.total)} ฿</div>
                          <div className="mt-1 text-xs text-[#64748b]">ยอดแทง {formatCurrency(activeTicket.subtotal)} ฿</div>
                        </div>
                      </div>

                      <div className="grid gap-3 md:grid-cols-3">
                        <div className="rounded-2xl border border-[#e5edf5] bg-white px-4 py-3">
                          <div className="text-xs text-[#60758d]">ยอดแทงรวม</div>
                          <div className="mt-1 text-lg font-semibold text-[#0f172a]">{formatCurrency(activeTicket.subtotal)} ฿</div>
                        </div>
                        <div className="rounded-2xl border border-[#e5edf5] bg-white px-4 py-3">
                          <div className="text-xs text-[#60758d]">ส่วนลด</div>
                          <div className="mt-1 text-lg font-semibold text-[#0f172a]">{formatCurrency(activeTicket.discount)} ฿</div>
                        </div>
                        <div className="rounded-2xl border border-[#d7e8df] bg-[#f2fbf5] px-4 py-3">
                          <div className="text-xs text-[#4b6b57]">ยอดหลังหักส่วนลด</div>
                          <div className="mt-1 text-lg font-semibold text-[#0f5132]">{formatCurrency(activeTicket.total)} ฿</div>
                        </div>
                      </div>

                      {activeTicket.note ? (
                        <div className="rounded-2xl border border-[#dbe7f3] bg-white px-4 py-3">
                          <div className="text-xs font-semibold uppercase tracking-[0.08em] text-[#60758d]">หมายเหตุ</div>
                          <div className="mt-2 text-sm text-[#334155]">{activeTicket.note}</div>
                        </div>
                      ) : null}

                      <div className="overflow-hidden rounded-2xl border border-[#e6edf5] bg-white shadow-[0_12px_30px_rgba(15,23,42,0.06)]">
                        <div className="border-b border-[#e6edf5] bg-[#f8fbff] px-4 py-3">
                          <div className="text-sm font-semibold text-[#0f172a]">รายละเอียดเลขในโพย</div>
                          <div className="mt-1 text-xs text-[#64748b]">แสดงประเภท เลข ยอดแทง และข้อมูลการคีย์ครบทุกบรรทัด</div>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full border-separate border-spacing-0 text-sm">
                            <thead>
                              <tr>
                                <th className="border-b border-[#e6edf5] bg-[#f8fbff] px-3 py-3 text-left text-[12px] font-semibold uppercase tracking-[0.05em] text-[#60758d]">ลำดับ</th>
                                <th className="border-b border-[#e6edf5] bg-[#f8fbff] px-3 py-3 text-left text-[12px] font-semibold uppercase tracking-[0.05em] text-[#60758d]">ประเภท</th>
                                <th className="border-b border-[#e6edf5] bg-[#f8fbff] px-3 py-3 text-left text-[12px] font-semibold uppercase tracking-[0.05em] text-[#60758d]">เลข</th>
                                <th className="border-b border-[#e6edf5] bg-[#f8fbff] px-3 py-3 text-left text-[12px] font-semibold uppercase tracking-[0.05em] text-[#60758d]">ยอดเงิน</th>
                                <th className="border-b border-[#e6edf5] bg-[#f8fbff] px-3 py-3 text-left text-[12px] font-semibold uppercase tracking-[0.05em] text-[#60758d]">ข้อมูลการคีย์</th>
                              </tr>
                            </thead>
                            <tbody>
                              {activeTicket.items.map((item, index) => (
                                <tr key={item.id}>
                                  <td className="border-b border-[#edf2f7] px-3 py-3 text-[14px] text-[#1f2937]">{index + 1}</td>
                                  <td className="border-b border-[#edf2f7] px-3 py-3 text-[14px] text-[#1f2937]">{getTicketLineLabel(item.betType, item.displayType)}</td>
                                  <td className="border-b border-[#edf2f7] px-3 py-3 font-mono text-[14px] text-[#1f2937]">{item.number}</td>
                                  <td className="border-b border-[#edf2f7] px-3 py-3 text-[14px] text-[#1f2937]">{formatCurrency(item.amount)} ฿</td>
                                  <td className="border-b border-[#edf2f7] px-3 py-3 font-mono text-[13px] text-[#1f2937]">
                                    {formatLegacyTicketEntry({
                                      betType: item.betType,
                                      number: item.number,
                                      amount: item.amount,
                                      activeType: item.displayType,
                                    })}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">ไม่มีโพย</div>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-[#dbe7f3] bg-[#f8fbff] px-4 py-4">
                <div className="text-sm font-semibold text-[#0f172a]">{activeCustomer.customerName}</div>
                <div className="mt-1 text-xs text-[#64748b]">{activeCustomer.tickets.length} โพยในงวดนี้</div>
                <div className="mt-3 grid gap-3">
                  <div className="rounded-xl bg-white px-3 py-3">
                    <div className="text-xs text-[#60758d]">ยอดแทงรวม</div>
                    <div className="mt-1 text-base font-semibold text-[#0f172a]">{formatCurrency(activeCustomer.subtotal)} ฿</div>
                  </div>
                  <div className="rounded-xl bg-white px-3 py-3">
                    <div className="text-xs text-[#60758d]">ยอดสุทธิรวม</div>
                    <div className="mt-1 text-base font-semibold text-[#0f172a]">{formatCurrency(activeCustomer.total)} ฿</div>
                  </div>
                </div>
              </div>

              <div className="max-h-[560px] overflow-y-auto rounded-2xl border border-[#dbe7f3]">
              <table className="legacy-period-table">
                <thead className="sticky top-0 z-10">
                  <tr>
                    <th>โพย</th>
                    <th className="w-[5%]">ข้อมูล</th>
                  </tr>
                </thead>
                <tbody>
                  {activeCustomer.tickets.map((ticket) => (
                    <tr key={ticket.id}>
                      <td
                        className={
                          activeTicket?.id === ticket.id
                            ? "border-l-4 border-l-[#0f7f79] bg-[#eef8f6] shadow-[inset_0_0_0_1px_rgba(15,127,121,0.08)]"
                            : undefined
                        }
                      >
                        <div className="font-medium">{ticket.displayName}</div>
                        <div className="mt-1 text-xs text-muted-foreground">{ticket.createdAtLabel}</div>
                        <div className="mt-1 text-xs text-[#64748b]">
                          {ticket.items.length} รายการ | ยอดสุทธิ {formatCurrency(ticket.total)} ฿
                        </div>
                      </td>
                      <td className={activeTicket?.id === ticket.id ? "bg-[#eef8f6] text-center" : "text-center"}>
                        <button
                          className={`legacy-btn-success legacy-icon-btn ${activeTicket?.id === ticket.id ? "ring-2 ring-[#0f7f79] ring-offset-2" : ""}`}
                          onClick={() => setActiveTicketId(ticket.id)}
                          type="button"
                        >
                          <Eye className="size-14px" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>
          </div>
        ) : null}
      </LegacyModal>
    </>
  );
}
