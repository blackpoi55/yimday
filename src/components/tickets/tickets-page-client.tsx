"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { LegacyModal } from "@/components/ui/legacy-modal";
import { betTypeLabels } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";

type TicketItem = {
  id: string;
  betType: keyof typeof betTypeLabels;
  number: string;
  amount: number;
  payoutRate: number;
  winAmount: number;
  hitLabel: string | null;
};

type TicketEntry = {
  id: string;
  drawId: string;
  drawName: string;
  displayName: string;
  customerName: string;
  agentName: string;
  subtotal: number;
  discount: number;
  total: number;
  winAmount: number;
  createdAtLabel: string;
  note: string | null;
  items: TicketItem[];
};

type TicketGroup = {
  drawId: string;
  drawName: string;
  tickets: TicketEntry[];
};

type TicketsPageClientProps = {
  createTicketHref: string | null;
  groupedTickets: TicketGroup[];
  selectedCustomerName: string | null;
  showClearFilter: boolean;
};

type TicketTypeSummary = {
  betType: TicketItem["betType"];
  label: string;
  count: number;
  amount: number;
  winAmount: number;
};

type TicketGroupSummary = {
  ticketCount: number;
  subtotal: number;
  total: number;
  winAmount: number;
};

function buildTicketTypeSummary(items: TicketItem[]) {
  const summary = new Map<TicketItem["betType"], TicketTypeSummary>();

  for (const item of items) {
    const current = summary.get(item.betType) ?? {
      betType: item.betType,
      label: betTypeLabels[item.betType],
      count: 0,
      amount: 0,
      winAmount: 0,
    };

    current.count += 1;
    current.amount += item.amount;
    current.winAmount += item.winAmount;
    summary.set(item.betType, current);
  }

  return [...summary.values()].sort((a, b) => b.amount - a.amount || a.label.localeCompare(b.label));
}

function buildTicketGroupSummary(group: TicketGroup | null): TicketGroupSummary {
  if (!group) {
    return {
      ticketCount: 0,
      subtotal: 0,
      total: 0,
      winAmount: 0,
    };
  }

  return group.tickets.reduce<TicketGroupSummary>(
    (acc, ticket) => {
      acc.ticketCount += 1;
      acc.subtotal += ticket.subtotal;
      acc.total += ticket.total;
      acc.winAmount += ticket.winAmount;
      return acc;
    },
    {
      ticketCount: 0,
      subtotal: 0,
      total: 0,
      winAmount: 0,
    },
  );
}

function getTicketStatusTone(winAmount: number) {
  return winAmount > 0
    ? "border-[#86d19f] bg-[#ecfff2] text-[#1f6f43]"
    : "border-[#d7e2ee] bg-white text-[#42526b]";
}

function normalizeSearchValue(value: string) {
  return value.trim().toLocaleLowerCase();
}

function matchesTicketSearch(ticket: TicketEntry, query: string) {
  if (!query) {
    return true;
  }

  const searchText = [
    ticket.displayName,
    ticket.customerName,
    ticket.agentName,
    ticket.createdAtLabel,
    ticket.note ?? "",
    ticket.subtotal,
    ticket.discount,
    ticket.total,
    ticket.winAmount,
    ...ticket.items.flatMap((item) => [
      betTypeLabels[item.betType],
      item.number,
      item.amount,
      item.winAmount,
      item.hitLabel ?? "",
    ]),
  ]
    .join(" ")
    .toLocaleLowerCase();

  return searchText.includes(query);
}

export function TicketsPageClient({
  createTicketHref,
  groupedTickets,
  selectedCustomerName,
  showClearFilter,
}: TicketsPageClientProps) {
  const [activeTicketId, setActiveTicketId] = useState<string | null>(null);
  const [selectedDrawId, setSelectedDrawId] = useState<string | null>(groupedTickets[0]?.drawId ?? null);
  const [searchTerm, setSearchTerm] = useState("");

  const activeTicket = useMemo(
    () => groupedTickets.flatMap((group) => group.tickets).find((ticket) => ticket.id === activeTicketId) ?? null,
    [activeTicketId, groupedTickets],
  );

  const selectedGroup = useMemo(
    () => groupedTickets.find((group) => group.drawId === selectedDrawId) ?? groupedTickets[0] ?? null,
    [groupedTickets, selectedDrawId],
  );

  const selectedGroupSummary = useMemo(() => buildTicketGroupSummary(selectedGroup), [selectedGroup]);
  const normalizedSearchTerm = useMemo(() => normalizeSearchValue(searchTerm), [searchTerm]);

  const filteredTickets = useMemo(() => {
    if (!selectedGroup) {
      return [];
    }

    return selectedGroup.tickets.filter((ticket) => matchesTicketSearch(ticket, normalizedSearchTerm));
  }, [normalizedSearchTerm, selectedGroup]);

  return (
    <>
      <div className="space-y-6">
        <section className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="legacy-title">โพยและบิล</h1>
            <p className="legacy-subtitle">
              {selectedCustomerName ? `กำลังดูของ ${selectedCustomerName}` : "รายการโพยตามสิทธิ์ผู้ใช้งาน"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {showClearFilter ? (
              <Link href="/dashboard/tickets">
                <Button variant="outline">ล้างตัวกรอง</Button>
              </Link>
            ) : null}
            {createTicketHref ? (
              <Link href={createTicketHref}>
                <Button>คีย์โพยใหม่</Button>
              </Link>
            ) : null}
          </div>
        </section>

        {groupedTickets.length === 0 ? (
          <div className="panel">
            <div className="panel-body text-center text-sm text-muted-foreground">ยังไม่มีรายการโพย</div>
          </div>
        ) : (
          <div className="legacy-grid-2">
            <div className="space-y-4">
              {selectedGroup ? (
                <div className="panel">
                  <div className="panel-header flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-medium">{selectedGroup.drawName}</h2>
                      <p className="text-sm text-muted-foreground">
                        พบ {filteredTickets.length} จาก {selectedGroup.tickets.length} บิล
                      </p>
                    </div>
                    <div className="w-full max-w-[280px]">
                      <input
                        className="h-11 w-full rounded-xl border border-[#d7e2ee] bg-white px-4 text-sm outline-none transition placeholder:text-muted-foreground focus:border-[#9bb8ff] focus:ring-2 focus:ring-[#dce8ff]"
                        onChange={(event) => setSearchTerm(event.target.value)}
                        placeholder="ค้นหาชื่อโพย ลูกค้า เลข หรือหมายเหตุ"
                        type="search"
                        value={searchTerm}
                      />
                    </div>
                  </div>

                  <div className="panel-body space-y-3">
                    {filteredTickets.length > 0 ? (
                      filteredTickets.map((ticket) => {
                        const typeSummary = buildTicketTypeSummary(ticket.items);
                        const reportHref = `/reports/tickets/${ticket.id}?print=1`;

                        return (
                          <details
                            key={ticket.id}
                            className="overflow-hidden rounded-[18px] border border-[#dbe6f2] bg-white/90 shadow-[0_14px_34px_rgba(15,23,42,0.06)]"
                          >
                            <summary className="cursor-pointer list-none bg-[linear-gradient(180deg,#f8fbff_0%,#eef5ff_100%)] px-4 py-3">
                              <div className="flex flex-wrap items-center justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-foreground">
                                    <span>{ticket.displayName}</span>
                                    <span className="text-muted-foreground">|</span>
                                    <span>{ticket.customerName}</span>
                                  </div>
                                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                                    <span>{ticket.items.length} รายการ</span>
                                    <span>พนักงาน {ticket.agentName}</span>
                                    <span>บันทึกเมื่อ {ticket.createdAtLabel}</span>
                                  </div>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  <div className="rounded-xl border border-[#d7e2ee] bg-white px-3 py-2 text-right">
                                    <div className="text-[11px] text-muted-foreground">ยอดแทง</div>
                                    <div className="text-sm font-semibold">{formatCurrency(ticket.subtotal)}</div>
                                  </div>
                                  <div className="rounded-xl border border-[#d7e2ee] bg-white px-3 py-2 text-right">
                                    <div className="text-[11px] text-muted-foreground">ส่วนลด</div>
                                    <div className="text-sm font-semibold">{formatCurrency(ticket.discount)}</div>
                                  </div>
                                  <div className="rounded-xl border border-[#cfe0ff] bg-[#f3f7ff] px-3 py-2 text-right">
                                    <div className="text-[11px] text-muted-foreground">สุทธิ</div>
                                    <div className="text-sm font-semibold text-[#155eef]">{formatCurrency(ticket.total)}</div>
                                  </div>
                                  <div className={`rounded-xl border px-3 py-2 text-right ${getTicketStatusTone(ticket.winAmount)}`}>
                                    <div className="text-[11px]">ถูกรางวัล</div>
                                    <div className="text-sm font-semibold">{formatCurrency(ticket.winAmount)}</div>
                                  </div>
                                </div>
                              </div>
                            </summary>

                            <div className="space-y-4 px-4 py-4">
                              <div className="grid gap-3 md:grid-cols-6">
                                <div className="rounded-xl border border-[#e5edf5] bg-[#fbfdff] px-4 py-3">
                                  <div className="text-xs text-muted-foreground">ลูกค้า</div>
                                  <div className="mt-1 font-medium">{ticket.customerName}</div>
                                </div>
                                <div className="rounded-xl border border-[#e5edf5] bg-[#fbfdff] px-4 py-3">
                                  <div className="text-xs text-muted-foreground">พนักงาน</div>
                                  <div className="mt-1 font-medium">{ticket.agentName}</div>
                                </div>
                                <div className="rounded-xl border border-[#e5edf5] bg-[#fbfdff] px-4 py-3">
                                  <div className="text-xs text-muted-foreground">ยอดแทง</div>
                                  <div className="mt-1 font-medium">{formatCurrency(ticket.subtotal)}</div>
                                </div>
                                <div className="rounded-xl border border-[#e5edf5] bg-[#fbfdff] px-4 py-3">
                                  <div className="text-xs text-muted-foreground">ส่วนลด</div>
                                  <div className="mt-1 font-medium">{formatCurrency(ticket.discount)}</div>
                                </div>
                                <div className="rounded-xl border border-[#d7e6ff] bg-[#f4f8ff] px-4 py-3">
                                  <div className="text-xs text-muted-foreground">ยอดสุทธิ</div>
                                  <div className="mt-1 font-semibold text-[#155eef]">{formatCurrency(ticket.total)}</div>
                                </div>
                                <div className="flex items-center justify-end">
                                  <div className="flex flex-wrap justify-end gap-2">
                                    <Link href={reportHref} rel="noreferrer" target="_blank">
                                      <Button variant="outline">PDF</Button>
                                    </Link>
                                    <button className="legacy-btn-default" onClick={() => setActiveTicketId(ticket.id)} type="button">
                                      รายละเอียด
                                    </button>
                                  </div>
                                </div>
                              </div>

                              {typeSummary.length > 0 ? (
                                <div className="rounded-[18px] border border-[#e5edf5] bg-[linear-gradient(180deg,#ffffff_0%,#fbfdff_100%)] px-4 py-4">
                                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                                    <div className="text-sm font-semibold">สรุปประเภทในโพย</div>
                                    <div className="text-xs text-muted-foreground">{ticket.items.length} รายการ</div>
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    {typeSummary.map((item) => (
                                      <div key={item.betType} className="min-w-[160px] rounded-xl border border-[#dfe8f2] bg-white px-3 py-2 shadow-[0_8px_18px_rgba(15,23,42,0.04)]">
                                        <div className="text-sm font-medium">{item.label}</div>
                                        <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                                          <span>{item.count} รายการ</span>
                                          <span>{formatCurrency(item.amount)}</span>
                                        </div>
                                        {item.winAmount > 0 ? (
                                          <div className="mt-1 text-xs font-medium text-[#1f6f43]">ถูกรางวัล {formatCurrency(item.winAmount)}</div>
                                        ) : null}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ) : null}

                              {ticket.note ? (
                                <div className="rounded-[18px] border border-[#e8eef5] bg-[#fbfdff] px-4 py-3">
                                  <div className="text-xs text-muted-foreground">หมายเหตุ</div>
                                  <div className="mt-1 text-sm">{ticket.note}</div>
                                </div>
                              ) : null}

                              <div className="table-shell">
                                <table>
                                  <thead>
                                    <tr>
                                      <th>ประเภท</th>
                                      <th>เลข</th>
                                      <th>เดิมพัน</th>
                                      <th>ได้</th>
                                      <th>สถานะ</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {ticket.items.map((item) => (
                                      <tr key={item.id} className={item.winAmount > 0 ? "bg-[#f6fff8]" : undefined}>
                                        <td>{betTypeLabels[item.betType]}</td>
                                        <td className="font-mono text-base">{item.number}</td>
                                        <td>{formatCurrency(item.amount)}</td>
                                        <td className={item.winAmount > 0 ? "font-semibold text-[#1f6f43]" : undefined}>
                                          {formatCurrency(item.winAmount)}
                                        </td>
                                        <td>
                                          {item.hitLabel ? (
                                            <span className="inline-flex rounded-full border border-[#86d19f] bg-[#ecfff2] px-2 py-1 text-xs font-medium text-[#1f6f43]">
                                              {item.hitLabel}
                                            </span>
                                          ) : (
                                            <span className="text-muted-foreground">-</span>
                                          )}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>

                              <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
                                <div>บันทึกเมื่อ {ticket.createdAtLabel}</div>
                                <div>{ticket.note ? "มีหมายเหตุแนบ" : "ไม่มีหมายเหตุ"}</div>
                              </div>
                            </div>
                          </details>
                        );
                      })
                    ) : (
                      <div className="rounded-[18px] border border-dashed border-[#cfdceb] bg-[#fbfdff] px-4 py-10 text-center text-sm text-muted-foreground">
                        ไม่พบบิลที่ตรงกับคำค้นหาในงวดนี้
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="space-y-4">
              <div className="panel">
                <div className="panel-header">
                  <div>
                    <h2 className="text-lg font-medium">สรุปบิล</h2>
                    <p className="text-sm text-muted-foreground">{selectedGroup?.drawName ?? "-"}</p>
                  </div>
                </div>
                <div className="panel-body">
                  <div className="table-shell">
                    <table>
                      <tbody>
                        <tr>
                          <th>จำนวนบิลทั้งหมด</th>
                          <td>{selectedGroupSummary.ticketCount}</td>
                        </tr>
                        <tr>
                          <th>ยอดแทงรวม</th>
                          <td>{formatCurrency(selectedGroupSummary.subtotal)}</td>
                        </tr>
                        <tr>
                          <th>ยอดสุทธิรวม</th>
                          <td>{formatCurrency(selectedGroupSummary.total)}</td>
                        </tr>
                        <tr>
                          <th>ยอดถูกรวม</th>
                          <td>{formatCurrency(selectedGroupSummary.winAmount)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="panel">
                <div className="panel-header">
                  <h2 className="text-lg font-medium">รายการงวด</h2>
                </div>
                <div className="panel-body space-y-3">
                  {groupedTickets.map((group) => {
                    const isActive = group.drawId === selectedGroup?.drawId;

                    return (
                      <button
                        key={group.drawId}
                        className={`w-full rounded-[16px] border px-4 py-3 text-left transition ${
                          isActive
                            ? "border-[#bfd3ff] bg-[#f2f7ff] shadow-[0_10px_24px_rgba(21,94,239,0.08)]"
                            : "border-[#e1e9f2] bg-white hover:border-[#cbd8e6] hover:bg-[#fbfdff]"
                        }`}
                        onClick={() => setSelectedDrawId(group.drawId)}
                        type="button"
                      >
                        <div className="font-medium">{group.drawName}</div>
                        <div className="mt-1 text-sm text-muted-foreground">{group.tickets.length} บิล</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <LegacyModal open={Boolean(activeTicket)} onClose={() => setActiveTicketId(null)} size="lg" title={activeTicket ? activeTicket.displayName : ""}>
        {activeTicket ? (
          <div className="space-y-6">
            <section className="legacy-grid-2-even">
              <div className="table-shell">
                <table>
                  <tbody>
                    <tr>
                      <th>งวด</th>
                      <td>{activeTicket.drawName}</td>
                    </tr>
                    <tr>
                      <th>ลูกค้า</th>
                      <td>{activeTicket.customerName}</td>
                    </tr>
                    <tr>
                      <th>พนักงาน</th>
                      <td>{activeTicket.agentName}</td>
                    </tr>
                    <tr>
                      <th>วันที่บันทึก</th>
                      <td>{activeTicket.createdAtLabel}</td>
                    </tr>
                    <tr>
                      <th>ยอดแทง</th>
                      <td>{formatCurrency(activeTicket.subtotal)}</td>
                    </tr>
                    <tr>
                      <th>ส่วนลด</th>
                      <td>{formatCurrency(activeTicket.discount)}</td>
                    </tr>
                    <tr>
                      <th>สุทธิ</th>
                      <td>{formatCurrency(activeTicket.total)}</td>
                    </tr>
                    <tr>
                      <th>ยอดถูก</th>
                      <td>{formatCurrency(activeTicket.winAmount)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="panel">
                <div className="panel-header">
                  <div>
                    <h2 className="text-lg font-medium">หมายเหตุ</h2>
                  </div>
                  <Link href={`/reports/tickets/${activeTicket.id}?print=1`} rel="noreferrer" target="_blank">
                    <Button variant="outline">PDF</Button>
                  </Link>
                </div>
                <div className="panel-body text-sm text-muted-foreground">{activeTicket.note || "-"}</div>
              </div>
            </section>

            <section className="table-shell">
              <table>
                <thead>
                  <tr>
                    <th>ประเภท</th>
                    <th>เลข</th>
                    <th>เดิมพัน</th>
                    <th>อัตราจ่าย</th>
                    <th>ได้</th>
                    <th>ผล</th>
                  </tr>
                </thead>
                <tbody>
                  {activeTicket.items.map((item) => (
                    <tr key={item.id}>
                      <td>{betTypeLabels[item.betType]}</td>
                      <td className="font-mono text-base">{item.number}</td>
                      <td>{formatCurrency(item.amount)}</td>
                      <td>{formatCurrency(item.payoutRate)}</td>
                      <td>{formatCurrency(item.winAmount)}</td>
                      <td>{item.hitLabel || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          </div>
        ) : null}
      </LegacyModal>
    </>
  );
}
