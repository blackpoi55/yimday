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
  summary: {
    ticketCount: number;
    subtotal: number;
    total: number;
    winAmount: number;
  };
};

export function TicketsPageClient({
  createTicketHref,
  groupedTickets,
  selectedCustomerName,
  showClearFilter,
  summary,
}: TicketsPageClientProps) {
  const [activeTicketId, setActiveTicketId] = useState<string | null>(null);

  const activeTicket = useMemo(
    () => groupedTickets.flatMap((group) => group.tickets).find((ticket) => ticket.id === activeTicketId) ?? null,
    [activeTicketId, groupedTickets],
  );

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

        {summary.ticketCount === 0 ? (
          <div className="panel">
            <div className="panel-body text-center text-sm text-muted-foreground">ยังไม่มีรายการโพย</div>
          </div>
        ) : (
          <div className="legacy-grid-2">
            <div className="space-y-4">
              {groupedTickets.map((group, groupIndex) => (
                <div key={group.drawId} className="panel">
                  <div className="panel-header">
                    <h2 className="text-lg font-medium">{group.drawName}</h2>
                  </div>
                  <div className="panel-body space-y-3">
                    {group.tickets.map((ticket, ticketIndex) => (
                      <details key={ticket.id} className="rounded-sm border border-border" open={groupIndex === 0 && ticketIndex === 0}>
                        <summary className="cursor-pointer bg-muted px-3 py-2 text-sm font-medium">
                          {ticket.displayName} | {ticket.customerName} | สุทธิ {formatCurrency(ticket.total)}
                        </summary>
                        <div className="space-y-4 px-3 py-3">
                          <div className="grid gap-3 md:grid-cols-5">
                            <div>
                              <div className="text-xs text-muted-foreground">ลูกค้า</div>
                              <div>{ticket.customerName}</div>
                            </div>
                            <div>
                              <div className="text-xs text-muted-foreground">พนักงาน</div>
                              <div>{ticket.agentName}</div>
                            </div>
                            <div>
                              <div className="text-xs text-muted-foreground">ยอดสุทธิ</div>
                              <div>{formatCurrency(ticket.total)}</div>
                            </div>
                            <div>
                              <div className="text-xs text-muted-foreground">ถูกรางวัล</div>
                              <div>{formatCurrency(ticket.winAmount)}</div>
                            </div>
                            <div>
                              <button className="legacy-btn-default" onClick={() => setActiveTicketId(ticket.id)} type="button">
                                รายละเอียด
                              </button>
                            </div>
                          </div>

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
                                  <tr key={item.id}>
                                    <td>{betTypeLabels[item.betType]}</td>
                                    <td className="font-mono text-base">{item.number}</td>
                                    <td>{formatCurrency(item.amount)}</td>
                                    <td>{formatCurrency(item.winAmount)}</td>
                                    <td>{item.hitLabel || "-"}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>

                          <div className="text-xs text-muted-foreground">บันทึกเมื่อ {ticket.createdAtLabel}</div>
                        </div>
                      </details>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-4">
              <div className="panel">
                <div className="panel-header">
                  <h2 className="text-lg font-medium">สรุปบิล</h2>
                </div>
                <div className="panel-body">
                  <div className="table-shell">
                    <table>
                      <tbody>
                        <tr>
                          <th>จำนวนบิลทั้งหมด</th>
                          <td>{summary.ticketCount}</td>
                        </tr>
                        <tr>
                          <th>ยอดแทงรวม</th>
                          <td>{formatCurrency(summary.subtotal)}</td>
                        </tr>
                        <tr>
                          <th>ยอดสุทธิรวม</th>
                          <td>{formatCurrency(summary.total)}</td>
                        </tr>
                        <tr>
                          <th>ยอดถูกรวม</th>
                          <td>{formatCurrency(summary.winAmount)}</td>
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
                  {groupedTickets.map((group) => (
                    <div key={group.drawId} className="border-b border-border pb-3 last:border-b-0 last:pb-0">
                      <div className="font-medium">{group.drawName}</div>
                      <div className="text-sm text-muted-foreground">{group.tickets.length} บิล</div>
                    </div>
                  ))}
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
                  <h2 className="text-lg font-medium">หมายเหตุ</h2>
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
