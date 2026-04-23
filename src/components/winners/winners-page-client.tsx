"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Eye } from "lucide-react";
import { BetType } from "@prisma/client";
import { LegacyModal } from "@/components/ui/legacy-modal";
import { Select } from "@/components/ui/select";
import { betTypeLabels } from "@/lib/constants";
import { cn, formatCurrency } from "@/lib/utils";

type WinningItem = {
  id: string;
  betType: BetType;
  number: string;
  amount: number;
  payoutRate: number;
  hitLabel: string;
  winAmount: number;
};

type WinningTicket = {
  ticketId: string;
  displayName: string;
  customerName: string;
  agentName: string;
  createdAtLabel: string;
  subtotal: number;
  total: number;
  winAmount: number;
  note: string | null;
  hitSummary: string[];
  winningItems: WinningItem[];
};

type WinnerDraw = {
  drawId: string;
  drawName: string;
  notes: string | null;
  result: {
    top3: string;
    top2: string;
    bottom3: string;
    bottom2: string;
    front3: string;
    back3: string;
  };
  winnerCount: number;
  totalWinAmount: number;
  winners: WinningTicket[];
};

type WinnersPageClientProps = {
  canManageResults: boolean;
  draws: WinnerDraw[];
  scopeNotice?: string | null;
};

type ResultTone = "top" | "bottom" | "front" | "back" | "tod" | "run";

const resultToneClasses: Record<ResultTone, { card: string; value: string; badge: string; row: string }> = {
  top: {
    card: "border-sky-200 bg-sky-50",
    value: "text-sky-700",
    badge: "border-sky-200 bg-sky-100 text-sky-800",
    row: "bg-sky-50/70",
  },
  bottom: {
    card: "border-emerald-200 bg-emerald-50",
    value: "text-emerald-700",
    badge: "border-emerald-200 bg-emerald-100 text-emerald-800",
    row: "bg-emerald-50/70",
  },
  front: {
    card: "border-cyan-200 bg-cyan-50",
    value: "text-cyan-700",
    badge: "border-cyan-200 bg-cyan-100 text-cyan-800",
    row: "bg-cyan-50/70",
  },
  back: {
    card: "border-rose-200 bg-rose-50",
    value: "text-rose-700",
    badge: "border-rose-200 bg-rose-100 text-rose-800",
    row: "bg-rose-50/70",
  },
  tod: {
    card: "border-violet-200 bg-violet-50",
    value: "text-violet-700",
    badge: "border-violet-200 bg-violet-100 text-violet-800",
    row: "bg-violet-50/70",
  },
  run: {
    card: "border-amber-200 bg-amber-50",
    value: "text-amber-700",
    badge: "border-amber-200 bg-amber-100 text-amber-800",
    row: "bg-amber-50/70",
  },
};

const resultFields: Array<{ key: keyof WinnerDraw["result"]; label: string; strong?: boolean; tone: ResultTone }> = [
  { key: "top3", label: "3 ตัวบน", strong: true, tone: "top" },
  { key: "top2", label: "2 ตัวบน", tone: "top" },
  { key: "bottom2", label: "2 ตัวล่าง", strong: true, tone: "bottom" },
  { key: "bottom3", label: "3 ตัวล่าง", tone: "bottom" },
  { key: "front3", label: "3 หน้า", tone: "front" },
  { key: "back3", label: "3 ท้าย", tone: "back" },
];

function getToneFromBetType(betType: BetType): ResultTone {
  switch (betType) {
    case BetType.TWO_TOP:
    case BetType.THREE_STRAIGHT:
      return "top";
    case BetType.TWO_BOTTOM:
    case BetType.THREE_BOTTOM:
      return "bottom";
    case BetType.FRONT_THREE:
      return "front";
    case BetType.BACK_THREE:
      return "back";
    case BetType.THREE_TOD:
      return "tod";
    case BetType.RUN_TOP:
    case BetType.RUN_BOTTOM:
      return "run";
    default:
      return "top";
  }
}

function getHitBadges(ticket: WinningTicket) {
  const badges = new Map<string, { label: string; tone: ResultTone }>();

  for (const item of ticket.winningItems) {
    const label = item.hitLabel || betTypeLabels[item.betType];
    badges.set(`${item.betType}:${label}`, {
      label,
      tone: getToneFromBetType(item.betType),
    });
  }

  return [...badges.values()];
}

export function WinnersPageClient({ canManageResults, draws, scopeNotice }: WinnersPageClientProps) {
  const [selectedDrawId, setSelectedDrawId] = useState(draws[0]?.drawId ?? "");
  const [activeTicketId, setActiveTicketId] = useState<string | null>(null);

  const selectedDraw = useMemo(
    () => draws.find((draw) => draw.drawId === selectedDrawId) ?? draws[0] ?? null,
    [draws, selectedDrawId],
  );
  const activeTicket = useMemo(
    () => draws.flatMap((draw) => draw.winners).find((ticket) => ticket.ticketId === activeTicketId) ?? null,
    [activeTicketId, draws],
  );
  const activeDraw = useMemo(
    () => draws.find((draw) => draw.winners.some((ticket) => ticket.ticketId === activeTicketId)) ?? null,
    [activeTicketId, draws],
  );
  const totalWinnerCount = draws.reduce((sum, draw) => sum + draw.winnerCount, 0);
  const totalWinAmount = draws.reduce((sum, draw) => sum + draw.totalWinAmount, 0);

  return (
    <>
      <div className="space-y-6">
        <section className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="legacy-title">ตรวจหวย</h1>
          </div>
          {canManageResults ? (
            <Link className="legacy-btn-default" href="/dashboard/results">
              กรอกผลรางวัล
            </Link>
          ) : null}
        </section>

        {scopeNotice ? (
          <div className="rounded-sm border border-[#bce8f1] bg-[#d9edf7] px-4 py-3 text-sm text-[#31708f]">{scopeNotice}</div>
        ) : null}

        {draws.length === 0 ? (
          <div className="panel">
            <div className="panel-body text-center text-sm text-muted-foreground">ยังไม่มีงวดที่บันทึกผลรางวัล</div>
          </div>
        ) : (
          <div className="grid gap-5 xl:grid-cols-[280px_minmax(0,1fr)]">
            <aside className="space-y-4">
              <div className="panel">
                <div className="panel-header">
                  <h2 className="text-lg font-medium">งวด</h2>
                </div>
                <div className="panel-body space-y-3">
                  <Select value={selectedDraw?.drawId ?? ""} onChange={(event) => setSelectedDrawId(event.target.value)}>
                    {draws.map((draw) => (
                      <option key={draw.drawId} value={draw.drawId}>
                        {draw.drawName}
                      </option>
                    ))}
                  </Select>

                  <div className="space-y-2">
                    {draws.slice(0, 8).map((draw) => (
                      <button
                        key={draw.drawId}
                        className={`w-full rounded-sm border px-3 py-3 text-left text-sm transition ${
                          selectedDraw?.drawId === draw.drawId
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border bg-background hover:bg-muted/40"
                        }`}
                        onClick={() => setSelectedDrawId(draw.drawId)}
                        type="button"
                      >
                        <div className="font-medium">{draw.drawName}</div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {draw.winnerCount} คน | {formatCurrency(draw.totalWinAmount)}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="panel">
                <div className="panel-body space-y-3">
                  <div>
                    <div className="text-xs text-muted-foreground">งวดที่ตรวจแล้ว</div>
                    <div className="text-2xl font-semibold">{draws.length}</div>
                  </div>
                  <hr className="soft-divider" />
                  <div>
                    <div className="text-xs text-muted-foreground">ผู้ถูกรางวัลรวม</div>
                    <div className="text-2xl font-semibold">{totalWinnerCount}</div>
                  </div>
                  <hr className="soft-divider" />
                  <div>
                    <div className="text-xs text-muted-foreground">ยอดถูกรวม</div>
                    <div className="text-2xl font-semibold text-primary">{formatCurrency(totalWinAmount)}</div>
                  </div>
                </div>
              </div>
            </aside>

            {selectedDraw ? (
              <main className="space-y-5">
                <section className="panel">
                  <div className="panel-header flex flex-wrap items-center justify-between gap-3">
                    <h2 className="text-xl font-medium">{selectedDraw.drawName}</h2>
                    <div className="flex flex-wrap gap-2">
                      <span className="pill bg-muted text-foreground">ถูก {selectedDraw.winnerCount} คน</span>
                      <span className="pill bg-accent text-accent-foreground">{formatCurrency(selectedDraw.totalWinAmount)}</span>
                    </div>
                  </div>
                  <div className="panel-body space-y-4">
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {resultFields.map((field) => (
                        <div
                          key={field.key}
                          className={cn("rounded-sm border px-4 py-4", resultToneClasses[field.tone].card)}
                        >
                          <div className="text-xs text-muted-foreground">{field.label}</div>
                          <div className={cn(field.strong ? "mt-1 text-3xl font-semibold" : "mt-1 text-2xl font-semibold", resultToneClasses[field.tone].value)}>
                            {selectedDraw.result[field.key] || "-"}
                          </div>
                        </div>
                      ))}
                    </div>

                    {selectedDraw.notes ? (
                      <div className="rounded-sm border border-border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
                        {selectedDraw.notes}
                      </div>
                    ) : null}
                  </div>
                </section>

                <section className="panel">
                  <div className="panel-header">
                    <h2 className="text-lg font-medium">คนถูกรางวัล</h2>
                  </div>
                  <div className="panel-body">
                    {selectedDraw.winners.length === 0 ? (
                      <div className="rounded-sm border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                        ไม่มีคนถูกรางวัลในงวดนี้
                      </div>
                    ) : (
                      <div className="table-shell">
                        <table>
                          <thead>
                            <tr>
                              <th>ลูกค้า</th>
                              <th>โพย</th>
                              <th>ถูก</th>
                              <th>ยอดถูก</th>
                              <th>ดู</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedDraw.winners.map((ticket) => (
                              <tr key={ticket.ticketId}>
                                <td>
                                  <div className="font-medium">{ticket.customerName}</div>
                                  <div className="text-xs text-muted-foreground">{ticket.agentName}</div>
                                </td>
                                <td>
                                  <div>{ticket.displayName}</div>
                                  <div className="text-xs text-muted-foreground">{ticket.createdAtLabel}</div>
                                </td>
                                <td>
                                  <div className="flex flex-wrap gap-1">
                                    {getHitBadges(ticket).map((badge) => (
                                      <span
                                        key={badge.label}
                                        className={cn("rounded-full border px-2 py-1 text-xs font-medium", resultToneClasses[badge.tone].badge)}
                                      >
                                        {badge.label}
                                      </span>
                                    ))}
                                  </div>
                                </td>
                                <td className="font-semibold text-primary">{formatCurrency(ticket.winAmount)}</td>
                                <td>
                                  <button
                                    className="legacy-btn-info legacy-icon-btn"
                                    onClick={() => setActiveTicketId(ticket.ticketId)}
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
                    )}
                  </div>
                </section>
              </main>
            ) : null}
          </div>
        )}
      </div>

      <LegacyModal
        open={Boolean(activeTicket && activeDraw)}
        onClose={() => setActiveTicketId(null)}
        size="lg"
        title={activeTicket ? `${activeTicket.customerName} | ${activeTicket.displayName}` : ""}
      >
        {activeTicket && activeDraw ? (
          <div className="space-y-6">
            <section className="legacy-grid-2-even">
              <div className="table-shell">
                <table>
                  <tbody>
                    <tr>
                      <th>งวด</th>
                      <td>{activeDraw.drawName}</td>
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
                  <h2 className="text-lg font-medium">เลขรางวัล</h2>
                </div>
                <div className="panel-body grid gap-3 sm:grid-cols-2">
                  {resultFields.map((field) => (
                    <div key={field.key} className={cn("rounded-sm border px-3 py-3", resultToneClasses[field.tone].card)}>
                      <div className="text-xs text-muted-foreground">{field.label}</div>
                      <div className={cn("mt-1 text-base font-medium", resultToneClasses[field.tone].value)}>
                        {activeDraw.result[field.key] || "-"}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="panel">
              <div className="panel-header">
                <h2 className="text-lg font-medium">รายการที่ถูก</h2>
              </div>
              <div className="panel-body">
                <div className="table-shell">
                  <table>
                    <thead>
                      <tr>
                        <th>ประเภท</th>
                        <th>เลข</th>
                        <th>ยอดแทง</th>
                        <th>อัตราจ่าย</th>
                        <th>ผลที่ถูก</th>
                        <th>ยอดถูก</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeTicket.winningItems.map((item) => {
                        const tone = getToneFromBetType(item.betType);

                        return (
                        <tr key={item.id} className={resultToneClasses[tone].row}>
                          <td>
                            <span className={cn("rounded-full border px-2 py-1 text-xs font-medium", resultToneClasses[tone].badge)}>
                              {betTypeLabels[item.betType]}
                            </span>
                          </td>
                          <td className="font-mono text-base">{item.number}</td>
                          <td>{formatCurrency(item.amount)}</td>
                          <td>{formatCurrency(item.payoutRate)}</td>
                          <td>{item.hitLabel}</td>
                          <td>{formatCurrency(item.winAmount)}</td>
                        </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>

            <section className="panel">
              <div className="panel-header">
                <h2 className="text-lg font-medium">หมายเหตุ</h2>
              </div>
              <div className="panel-body text-sm text-muted-foreground">{activeTicket.note || "-"}</div>
            </section>
          </div>
        ) : null}
      </LegacyModal>
    </>
  );
}
