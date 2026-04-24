import Link from "next/link";
import { Role } from "@prisma/client";
import { notFound } from "next/navigation";
import { TicketReportActions } from "@/components/tickets/ticket-report-actions";
import { requireSession } from "@/lib/auth";
import { betTypeLabels } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { buildTicketDisplayNameMap, getTicketDisplayName } from "@/lib/ticket-display";
import { formatCurrency, formatDateTime } from "@/lib/utils";

type TicketReportPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams?: Promise<{
    print?: string;
  }>;
};

type TicketTypeSummary = {
  betType: string;
  label: string;
  count: number;
  amount: number;
  winAmount: number;
};

function buildTicketTypeSummary(
  items: {
    betType: keyof typeof betTypeLabels;
    amount: number;
    winAmount: number;
  }[],
) {
  const summary = new Map<string, TicketTypeSummary>();

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

  return [...summary.values()].sort((a, b) => b.amount - a.amount || a.label.localeCompare(b.label, "th"));
}

export default async function TicketReportPage({ params, searchParams }: TicketReportPageProps) {
  const session = await requireSession();
  const { id } = await params;
  const resolvedSearchParams = (await searchParams) ?? {};

  const ticket = await prisma.ticket.findFirst({
    where:
      session.role === Role.ADMIN
        ? { id }
        : session.role === Role.AGENT
          ? { id, agentId: session.userId }
          : { id, customerId: session.userId },
    include: {
      Draw: true,
      BetItem: {
        orderBy: {
          createdAt: "asc",
        },
      },
      User_Ticket_agentIdToUser: true,
      User_Ticket_customerIdToUser: true,
    },
  });

  if (!ticket) {
    notFound();
  }

  const siblingTickets = await prisma.ticket.findMany({
    where: {
      customerId: ticket.customerId,
      drawId: ticket.drawId,
    },
    select: {
      id: true,
      customerId: true,
      drawId: true,
      createdAt: true,
    },
  });

  const ticketDisplayNames = buildTicketDisplayNameMap(siblingTickets);
  const displayName = getTicketDisplayName(ticket.id, ticketDisplayNames, ticket.code);
  const typeSummary = buildTicketTypeSummary(
    ticket.BetItem.map((item) => ({
      betType: item.betType,
      amount: Number(item.amount),
      winAmount: Number(item.winAmount),
    })),
  );
  const totalItems = ticket.BetItem.length;
  const totalAmount = Number(ticket.subtotal);
  const totalDiscount = Number(ticket.discount);
  const totalNet = Number(ticket.total);
  const totalWin = Number(ticket.winAmount);

  return (
    <div className="report-a4-shell min-h-screen bg-[radial-gradient(circle_at_top,#eff6ff_0%,#f8fbff_38%,#eef4fb_100%)] px-4 py-6 print:bg-white print:px-0 print:py-0">
      <div className="mx-auto flex max-w-[1040px] items-center justify-between gap-3 pb-4 print:hidden">
        <Link className="legacy-btn-default" href="/dashboard/tickets">
          กลับหน้ารายการโพย
        </Link>
        <TicketReportActions autoPrint={resolvedSearchParams.print === "1"} />
      </div>

      <article className="report-a4-page mx-auto overflow-hidden rounded-[28px] border border-white/80 bg-white shadow-[0_30px_90px_rgba(15,23,42,0.16)] print:max-w-none print:rounded-none print:border-0 print:shadow-none">
        <section className="report-a4-section report-a4-hero border-b border-[#dbe7f3] bg-[linear-gradient(135deg,#1457df_0%,#0d47bb_52%,#0a3b97_100%)] px-8 py-8 text-white print:bg-[#1457df]">
          <div className="report-a4-hero-grid flex flex-wrap items-start justify-between gap-6">
            <div className="max-w-[620px]">
              <div className="inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold tracking-[0.16em] uppercase text-white/80">
                Ticket Report
              </div>
              <h1 className="mt-4 text-[34px] font-semibold leading-tight">{displayName}</h1>
              <p className="report-a4-intro mt-3 max-w-[560px] text-[15px] leading-7 text-white/82">
                รายงานสรุปโพยพร้อมรายละเอียดเลขที่ซื้อ แยกยอดแทง ส่วนลด ยอดสุทธิ และผลถูกรางวัลในเอกสารเดียว
              </p>
            </div>

            <div className="report-a4-meta-grid grid min-w-[280px] gap-3 sm:grid-cols-2">
              <div className="rounded-[22px] border border-white/16 bg-white/10 px-4 py-4 backdrop-blur-sm">
                <div className="text-[11px] uppercase tracking-[0.12em] text-white/68">งวด</div>
                <div className="mt-2 text-[17px] font-semibold">{ticket.Draw.name}</div>
              </div>
              <div className="rounded-[22px] border border-white/16 bg-white/10 px-4 py-4 backdrop-blur-sm">
                <div className="text-[11px] uppercase tracking-[0.12em] text-white/68">วันที่บันทึก</div>
                <div className="mt-2 text-[17px] font-semibold">{formatDateTime(ticket.createdAt)}</div>
              </div>
              <div className="rounded-[22px] border border-white/16 bg-white/10 px-4 py-4 backdrop-blur-sm">
                <div className="text-[11px] uppercase tracking-[0.12em] text-white/68">ลูกค้า</div>
                <div className="mt-2 text-[17px] font-semibold">{ticket.User_Ticket_customerIdToUser.name}</div>
              </div>
              <div className="rounded-[22px] border border-white/16 bg-white/10 px-4 py-4 backdrop-blur-sm">
                <div className="text-[11px] uppercase tracking-[0.12em] text-white/68">พนักงาน</div>
                <div className="mt-2 text-[17px] font-semibold">{ticket.User_Ticket_agentIdToUser.name}</div>
              </div>
            </div>
          </div>
        </section>

        <section className="report-a4-section report-a4-metrics grid gap-4 bg-[linear-gradient(180deg,#f8fbff_0%,#ffffff_100%)] px-8 py-6 md:grid-cols-4 print:bg-white">
          <div className="report-a4-metric-card rounded-[22px] border border-[#dbe7f3] bg-white px-5 py-4 shadow-[0_12px_24px_rgba(15,23,42,0.04)]">
            <div className="text-[12px] font-medium text-[#6b7c93]">จำนวนรายการ</div>
            <div className="mt-2 text-[28px] font-semibold text-[#0f172a]">{totalItems}</div>
          </div>
          <div className="report-a4-metric-card rounded-[22px] border border-[#dbe7f3] bg-white px-5 py-4 shadow-[0_12px_24px_rgba(15,23,42,0.04)]">
            <div className="text-[12px] font-medium text-[#6b7c93]">ยอดแทงรวม</div>
            <div className="mt-2 text-[28px] font-semibold text-[#0f172a]">{formatCurrency(totalAmount)}</div>
          </div>
          <div className="report-a4-metric-card rounded-[22px] border border-[#cfe0ff] bg-[#f4f8ff] px-5 py-4 shadow-[0_12px_24px_rgba(21,94,239,0.06)]">
            <div className="text-[12px] font-medium text-[#6b7c93]">ยอดสุทธิ</div>
            <div className="mt-2 text-[28px] font-semibold text-[#155eef]">{formatCurrency(totalNet)}</div>
          </div>
          <div className="report-a4-metric-card rounded-[22px] border border-[#dbe7f3] bg-white px-5 py-4 shadow-[0_12px_24px_rgba(15,23,42,0.04)]">
            <div className="text-[12px] font-medium text-[#6b7c93]">ยอดถูกรางวัล</div>
            <div className={`mt-2 text-[28px] font-semibold ${totalWin > 0 ? "text-[#1f6f43]" : "text-[#0f172a]"}`}>
              {formatCurrency(totalWin)}
            </div>
          </div>
        </section>

        <section className="report-a4-content grid gap-6 px-8 py-7 lg:grid-cols-[1.35fr_0.95fr]">
          <div className="report-a4-column space-y-6">
            <section className="report-a4-section overflow-hidden rounded-[24px] border border-[#dbe7f3] bg-white">
              <div className="border-b border-[#e7eef7] bg-[linear-gradient(180deg,#fbfdff_0%,#f3f8ff_100%)] px-5 py-4">
                <h2 className="text-[18px] font-semibold text-[#0f172a]">รายละเอียดเลขในโพย</h2>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] border-separate border-spacing-0 text-[14px]">
                  <thead>
                    <tr>
                      <th className="border-b border-[#e7eef7] bg-[#f8fbff] px-4 py-3 text-left text-[12px] font-semibold uppercase tracking-[0.05em] text-[#60758d]">ประเภท</th>
                      <th className="border-b border-[#e7eef7] bg-[#f8fbff] px-4 py-3 text-left text-[12px] font-semibold uppercase tracking-[0.05em] text-[#60758d]">เลข</th>
                      <th className="border-b border-[#e7eef7] bg-[#f8fbff] px-4 py-3 text-left text-[12px] font-semibold uppercase tracking-[0.05em] text-[#60758d]">เดิมพัน</th>
                      <th className="border-b border-[#e7eef7] bg-[#f8fbff] px-4 py-3 text-left text-[12px] font-semibold uppercase tracking-[0.05em] text-[#60758d]">อัตราจ่าย</th>
                      <th className="border-b border-[#e7eef7] bg-[#f8fbff] px-4 py-3 text-left text-[12px] font-semibold uppercase tracking-[0.05em] text-[#60758d]">ได้</th>
                      <th className="border-b border-[#e7eef7] bg-[#f8fbff] px-4 py-3 text-left text-[12px] font-semibold uppercase tracking-[0.05em] text-[#60758d]">ผล</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ticket.BetItem.map((item, index) => (
                      <tr key={item.id} className={item.winAmount > 0 ? "bg-[#f6fff8]" : index % 2 === 0 ? "bg-white" : "bg-[#fbfdff]"}>
                        <td className="border-b border-[#edf2f7] px-4 py-3">{betTypeLabels[item.betType]}</td>
                        <td className="border-b border-[#edf2f7] px-4 py-3 font-mono text-[16px] font-medium text-[#0f172a]">{item.number}</td>
                        <td className="border-b border-[#edf2f7] px-4 py-3">{formatCurrency(item.amount.toString())}</td>
                        <td className="border-b border-[#edf2f7] px-4 py-3">{formatCurrency(item.payoutRate?.toString() ?? "0")}</td>
                        <td className={`border-b border-[#edf2f7] px-4 py-3 ${item.winAmount > 0 ? "font-semibold text-[#1f6f43]" : ""}`}>
                          {formatCurrency(item.winAmount.toString())}
                        </td>
                        <td className="border-b border-[#edf2f7] px-4 py-3">
                          {item.hitLabel ? (
                            <span className="inline-flex rounded-full border border-[#86d19f] bg-[#ecfff2] px-2 py-1 text-[12px] font-medium text-[#1f6f43]">
                              {item.hitLabel}
                            </span>
                          ) : (
                            <span className="text-[#64748b]">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="report-a4-section rounded-[24px] border border-[#dbe7f3] bg-white p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-[18px] font-semibold text-[#0f172a]">หมายเหตุ</h2>
                  <p className="mt-1 text-sm text-[#6b7c93]">ข้อความประกอบโพยจากผู้คีย์หรือพนักงาน</p>
                </div>
                <div className="rounded-full border border-[#dbe7f3] bg-[#f8fbff] px-3 py-1 text-[12px] font-medium text-[#60758d]">
                  ส่วนลด {formatCurrency(totalDiscount)}
                </div>
              </div>
              <div className="mt-4 rounded-[18px] border border-[#e5edf5] bg-[linear-gradient(180deg,#fbfdff_0%,#f8fbff_100%)] px-4 py-4 text-[15px] leading-7 text-[#334155]">
                {ticket.note || "ไม่มีหมายเหตุ"}
              </div>
            </section>
          </div>

          <div className="report-a4-column space-y-6">
            <section className="report-a4-section rounded-[24px] border border-[#dbe7f3] bg-white p-5">
              <h2 className="text-[18px] font-semibold text-[#0f172a]">สรุปยอดบิล</h2>
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between rounded-[18px] border border-[#e5edf5] bg-[#fbfdff] px-4 py-3">
                  <span className="text-sm text-[#64748b]">ยอดแทงรวม</span>
                  <span className="text-[16px] font-semibold text-[#0f172a]">{formatCurrency(totalAmount)}</span>
                </div>
                <div className="flex items-center justify-between rounded-[18px] border border-[#e5edf5] bg-[#fbfdff] px-4 py-3">
                  <span className="text-sm text-[#64748b]">ส่วนลด</span>
                  <span className="text-[16px] font-semibold text-[#0f172a]">{formatCurrency(totalDiscount)}</span>
                </div>
                <div className="flex items-center justify-between rounded-[18px] border border-[#cfe0ff] bg-[#f4f8ff] px-4 py-3">
                  <span className="text-sm text-[#64748b]">ยอดสุทธิ</span>
                  <span className="text-[18px] font-semibold text-[#155eef]">{formatCurrency(totalNet)}</span>
                </div>
                <div className="flex items-center justify-between rounded-[18px] border border-[#e5edf5] bg-[#fbfdff] px-4 py-3">
                  <span className="text-sm text-[#64748b]">ยอดถูกรางวัล</span>
                  <span className={`text-[18px] font-semibold ${totalWin > 0 ? "text-[#1f6f43]" : "text-[#0f172a]"}`}>
                    {formatCurrency(totalWin)}
                  </span>
                </div>
              </div>
            </section>

            <section className="report-a4-section rounded-[24px] border border-[#dbe7f3] bg-white p-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-[18px] font-semibold text-[#0f172a]">สรุปตามประเภท</h2>
                <div className="rounded-full border border-[#dbe7f3] bg-[#f8fbff] px-3 py-1 text-[12px] font-medium text-[#60758d]">
                  {totalItems} รายการ
                </div>
              </div>
              <div className="mt-4 space-y-3">
                {typeSummary.map((item) => (
                  <div key={item.betType} className="rounded-[18px] border border-[#e5edf5] bg-[linear-gradient(180deg,#ffffff_0%,#fbfdff_100%)] px-4 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-[15px] font-semibold text-[#0f172a]">{item.label}</div>
                        <div className="mt-1 text-sm text-[#64748b]">{item.count} รายการ</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[16px] font-semibold text-[#0f172a]">{formatCurrency(item.amount)}</div>
                        <div className={`mt-1 text-sm ${item.winAmount > 0 ? "font-medium text-[#1f6f43]" : "text-[#64748b]"}`}>
                          ถูก {formatCurrency(item.winAmount)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="report-a4-section rounded-[24px] border border-[#dbe7f3] bg-[linear-gradient(180deg,#fbfdff_0%,#f6faff_100%)] p-5">
              <h2 className="text-[18px] font-semibold text-[#0f172a]">ข้อมูลอ้างอิง</h2>
              <div className="mt-4 space-y-3 text-[14px] text-[#334155]">
                <div className="flex items-start justify-between gap-4 border-b border-[#e2e8f0] pb-3">
                  <span className="text-[#64748b]">เลขที่โพย</span>
                  <span className="font-medium text-right">{displayName}</span>
                </div>
                <div className="flex items-start justify-between gap-4 border-b border-[#e2e8f0] pb-3">
                  <span className="text-[#64748b]">งวด</span>
                  <span className="font-medium text-right">{ticket.Draw.name}</span>
                </div>
                <div className="flex items-start justify-between gap-4 border-b border-[#e2e8f0] pb-3">
                  <span className="text-[#64748b]">ลูกค้า</span>
                  <span className="font-medium text-right">{ticket.User_Ticket_customerIdToUser.name}</span>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <span className="text-[#64748b]">พิมพ์รายงานเมื่อ</span>
                  <span className="font-medium text-right">{formatDateTime(new Date())}</span>
                </div>
              </div>
            </section>
          </div>
        </section>
        <footer className="report-a4-section flex items-center justify-between gap-4 border-t border-[#e2e8f0] bg-[linear-gradient(180deg,#fbfdff_0%,#f7fbff_100%)] px-8 py-5 text-[12px] text-[#6b7c93]">
          <div>เอกสารสรุปโพยสำหรับพิมพ์ขนาด A4</div>
          <div>{displayName}</div>
        </footer>
      </article>
    </div>
  );
}
