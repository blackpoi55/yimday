import Link from "next/link";
import { Role } from "@prisma/client";
import { notFound } from "next/navigation";
import { TicketReportActions } from "@/components/tickets/ticket-report-actions";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTicketRecorderLabel, parseTicketEntryNote } from "@/lib/ticket-entry-source";
import { buildAgentRecordedTicketWhere } from "@/lib/ticket-scope";
import { buildTicketDisplayNameMap, getTicketDisplayName } from "@/lib/ticket-display";
import { getTicketLineLabel } from "@/lib/ticket-line";
import { formatCurrency, formatDateTime } from "@/lib/utils";

type TicketReportPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams?: Promise<{
    print?: string;
  }>;
};

export default async function TicketReportPage({ params, searchParams }: TicketReportPageProps) {
  const session = await requireSession();
  const { id } = await params;
  const resolvedSearchParams = (await searchParams) ?? {};

  const ticket = await prisma.ticket.findFirst({
    where:
      session.role === Role.ADMIN
        ? { id }
        : session.role === Role.AGENT
          ? { id, ...buildAgentRecordedTicketWhere(session.userId) }
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
    where:
      session.role === Role.AGENT
        ? {
            customerId: ticket.customerId,
            drawId: ticket.drawId,
            ...buildAgentRecordedTicketWhere(session.userId),
          }
        : {
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
  const parsedEntryNote = parseTicketEntryNote(ticket.note);
  const recorderLabel = getTicketRecorderLabel(ticket.User_Ticket_agentIdToUser.name, parsedEntryNote.isSelfEntry);
  const totalItems = ticket.BetItem.length;
  const totalAmount = Number(ticket.subtotal);
  const totalDiscount = Number(ticket.discount);
  const totalNet = Number(ticket.total);
  const totalWin = Number(ticket.winAmount);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#edf4ff_0%,#f7fbff_34%,#edf3fb_100%)] px-4 py-6 print:bg-white print:px-0 print:py-0">
      <div className="mx-auto flex max-w-[980px] items-center justify-between gap-3 pb-4 print:hidden">
        <Link className="legacy-btn-default" href="/dashboard/tickets">
          กลับหน้ารายการโพย
        </Link>
        <TicketReportActions autoPrint={resolvedSearchParams.print === "1"} />
      </div>

      <article className="mx-auto w-full max-w-[210mm] overflow-hidden rounded-[24px] border border-white/80 bg-white shadow-[0_28px_70px_rgba(15,23,42,0.14)] print:max-w-none print:rounded-none print:border-0 print:shadow-none print:[print-color-adjust:exact] print:[-webkit-print-color-adjust:exact]">
        <header className="border-b border-[#dbe7f3] bg-[linear-gradient(135deg,#0f4ed1_0%,#155eef_42%,#5b9cff_100%)] px-6 py-6 text-white print:px-[5mm] print:py-[4.5mm] print:[break-inside:avoid]">
          <div className="mb-4 flex items-center justify-between gap-3 print:mb-[2mm]">
            <div className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/80 print:px-[2mm] print:py-[0.8mm] print:text-[8px]">
              Ticket Report
            </div>
            <div className="rounded-full border border-white/14 bg-white/10 px-3 py-1 text-xs font-medium text-white/80 print:px-[2mm] print:py-[0.8mm] print:text-[8.5px]">
              {ticket.Draw.name}
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr] print:grid-cols-[1.12fr_72mm] print:gap-[2.5mm]">
            <div>
              <h1 className="text-[36px] leading-none font-semibold tracking-[-0.03em] text-white print:text-[24px]">{displayName}</h1>
              <p className="mt-2 max-w-[520px] text-sm leading-6 text-white/78 print:mt-[1mm] print:max-w-none print:text-[9.5px] print:leading-[1.35]">
                เอกสารสรุปโพยพร้อมรายละเอียดเลขที่ซื้อ ยอดแทง ส่วนลด ยอดสุทธิ และผลการถูกรางวัล
              </p>

              <div className="mt-4 grid gap-3 sm:grid-cols-2 print:mt-[2mm] print:gap-[1.5mm]">
                <div className="rounded-[18px] border border-white/14 bg-white/12 px-4 py-3 backdrop-blur-sm print:rounded-[3mm] print:bg-white/14 print:px-[2.2mm] print:py-[1.8mm] print:backdrop-blur-none">
                  <div className="text-[11px] text-white/70 print:text-[8px]">ลูกค้า</div>
                  <div className="mt-1 text-[16px] font-semibold text-white print:mt-[0.6mm] print:text-[10px]">{ticket.User_Ticket_customerIdToUser.name}</div>
                </div>
                <div className="rounded-[18px] border border-white/14 bg-white/12 px-4 py-3 backdrop-blur-sm print:rounded-[3mm] print:bg-white/14 print:px-[2.2mm] print:py-[1.8mm] print:backdrop-blur-none">
                  <div className="text-[11px] text-white/70 print:text-[8px]">ผู้บันทึก</div>
                  <div className="mt-1 text-[16px] font-semibold text-white print:mt-[0.6mm] print:text-[10px]">{recorderLabel}</div>
                </div>
                <div className="rounded-[18px] border border-white/14 bg-white/12 px-4 py-3 backdrop-blur-sm print:rounded-[3mm] print:bg-white/14 print:px-[2.2mm] print:py-[1.8mm] print:backdrop-blur-none">
                  <div className="text-[11px] text-white/70 print:text-[8px]">วันที่บันทึก</div>
                  <div className="mt-1 text-[16px] font-semibold text-white print:mt-[0.6mm] print:text-[10px]">{formatDateTime(ticket.createdAt)}</div>
                </div>
                <div className="rounded-[18px] border border-white/14 bg-white/12 px-4 py-3 backdrop-blur-sm print:rounded-[3mm] print:bg-white/14 print:px-[2.2mm] print:py-[1.8mm] print:backdrop-blur-none">
                  <div className="text-[11px] text-white/70 print:text-[8px]">จำนวนรายการ</div>
                  <div className="mt-1 text-[16px] font-semibold text-white print:mt-[0.6mm] print:text-[10px]">{totalItems} รายการ</div>
                </div>
              </div>
            </div>

            <aside className="rounded-[22px] border border-white/14 bg-white/10 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-sm print:rounded-[3mm] print:border-white/18 print:bg-white/14 print:p-[2.2mm] print:backdrop-blur-none">
              <div className="mb-3 text-[12px] font-semibold uppercase tracking-[0.12em] text-white/72 print:mb-[1mm] print:text-[8px]">สรุปยอดบิล</div>
              <div className="grid gap-2 print:gap-[1mm]">
                <div className="rounded-[16px] border border-white/12 bg-white/10 px-3 py-3 print:rounded-[2.6mm] print:px-[1.8mm] print:py-[1.5mm]">
                  <div className="text-[10px] text-white/66 print:text-[7.6px]">ยอดแทงรวม</div>
                  <div className="mt-1 text-[18px] font-semibold text-white print:mt-[0.5mm] print:text-[10.5px]">{formatCurrency(totalAmount)}</div>
                </div>
                <div className="grid grid-cols-2 gap-2 print:gap-[1mm]">
                  <div className="rounded-[16px] border border-white/12 bg-white/10 px-3 py-3 print:rounded-[2.6mm] print:px-[1.8mm] print:py-[1.5mm]">
                    <div className="text-[10px] text-white/66 print:text-[7.6px]">ส่วนลด</div>
                    <div className="mt-1 text-[16px] font-semibold text-white print:mt-[0.5mm] print:text-[9.6px]">{formatCurrency(totalDiscount)}</div>
                  </div>
                  <div className="rounded-[16px] border border-white/12 bg-white/10 px-3 py-3 print:rounded-[2.6mm] print:px-[1.8mm] print:py-[1.5mm]">
                    <div className="text-[10px] text-white/66 print:text-[7.6px]">ถูก</div>
                    <div className="mt-1 text-[16px] font-semibold text-white print:mt-[0.5mm] print:text-[9.6px]">{formatCurrency(totalWin)}</div>
                  </div>
                </div>
                <div className="rounded-[16px] border border-[#9bc0ff] bg-[linear-gradient(180deg,#eff5ff_0%,#dfeaff_100%)] px-3 py-3 text-[#1146ae] print:rounded-[2.6mm] print:px-[1.8mm] print:py-[1.5mm]">
                  <div className="text-[10px] text-[#4b72b8] print:text-[7.6px]">ยอดสุทธิ</div>
                  <div className="mt-1 text-[20px] font-semibold print:mt-[0.5mm] print:text-[11px]">{formatCurrency(totalNet)}</div>
                </div>
              </div>
            </aside>
          </div>
        </header>

        <section className="px-5 py-4 print:px-[5mm] print:py-[3mm] print:[break-inside:avoid]">
          <div className="overflow-hidden rounded-[18px] border border-[#dbe7f3] bg-white shadow-[0_12px_30px_rgba(15,23,42,0.04)] print:rounded-[3mm] print:shadow-none">
            <div className="flex items-center justify-between gap-3 border-b border-[#e7eef7] bg-[linear-gradient(180deg,#fbfdff_0%,#f4f8ff_100%)] px-4 py-3 print:px-[2.2mm] print:py-[1.8mm]">
              <div>
                <h2 className="text-[18px] font-semibold text-[#0f172a] print:text-[11px]">รายละเอียดเลขในโพย</h2>
                <p className="mt-1 text-xs text-[#60758d] print:mt-[0.4mm] print:text-[7.6px]">รายการเลขทั้งหมด {totalItems} รายการ</p>
              </div>
              <div className="hidden flex-wrap gap-2 sm:flex">
                <span className="inline-flex rounded-full border border-[#dbe7f3] bg-white px-3 py-1 text-[11px] font-medium text-[#60758d] print:px-[1.5mm] print:py-[0.6mm] print:text-[7.5px]">
                  งวด {ticket.Draw.name}
                </span>
              </div>
            </div>

            <table className="w-full table-fixed border-collapse">
              <colgroup>
                <col style={{ width: "25%" }} />
                <col style={{ width: "12%" }} />
                <col style={{ width: "15%" }} />
                <col style={{ width: "15%" }} />
                <col style={{ width: "13%" }} />
                <col style={{ width: "20%" }} />
              </colgroup>
              <thead>
                <tr>
                  <th className="border-b border-[#e7eef7] bg-[#f8fbff] px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.04em] text-[#60758d] print:px-[1.5mm] print:py-[1.1mm] print:text-[7.3px]">ประเภท</th>
                  <th className="border-b border-[#e7eef7] bg-[#f8fbff] px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.04em] text-[#60758d] print:px-[1.5mm] print:py-[1.1mm] print:text-[7.3px]">เลข</th>
                  <th className="border-b border-[#e7eef7] bg-[#f8fbff] px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.04em] text-[#60758d] print:px-[1.5mm] print:py-[1.1mm] print:text-[7.3px]">เดิมพัน</th>
                  <th className="border-b border-[#e7eef7] bg-[#f8fbff] px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.04em] text-[#60758d] print:px-[1.5mm] print:py-[1.1mm] print:text-[7.3px]">อัตราจ่าย</th>
                  <th className="border-b border-[#e7eef7] bg-[#f8fbff] px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.04em] text-[#60758d] print:px-[1.5mm] print:py-[1.1mm] print:text-[7.3px]">ได้</th>
                  <th className="border-b border-[#e7eef7] bg-[#f8fbff] px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.04em] text-[#60758d] print:px-[1.5mm] print:py-[1.1mm] print:text-[7.3px]">ผล</th>
                </tr>
              </thead>
              <tbody>
                {ticket.BetItem.map((item, index) => (
                  <tr key={item.id} className={Number(item.winAmount) > 0 ? "bg-[#f6fff8]" : index % 2 === 1 ? "bg-[#fbfdff]" : "bg-white"}>
                    <td className="border-b border-[#edf2f7] px-3 py-2.5 text-[13px] text-[#334155] print:px-[1.5mm] print:py-[1.1mm] print:text-[7.9px]">{getTicketLineLabel(item.betType, item.displayType)}</td>
                    <td className="border-b border-[#edf2f7] px-3 py-2.5 font-mono text-[14px] font-semibold text-[#0f172a] print:px-[1.5mm] print:py-[1.1mm] print:text-[8.1px]">{item.number}</td>
                    <td className="border-b border-[#edf2f7] px-3 py-2.5 text-[13px] text-[#334155] print:px-[1.5mm] print:py-[1.1mm] print:text-[7.9px]">{formatCurrency(item.amount.toString())}</td>
                    <td className="border-b border-[#edf2f7] px-3 py-2.5 text-[13px] text-[#334155] print:px-[1.5mm] print:py-[1.1mm] print:text-[7.9px]">{formatCurrency(item.payoutRate?.toString() ?? "0")}</td>
                    <td className={`border-b border-[#edf2f7] px-3 py-2.5 text-[13px] print:px-[1.5mm] print:py-[1.1mm] print:text-[7.9px] ${Number(item.winAmount) > 0 ? "font-semibold text-[#1f6f43]" : "text-[#334155]"}`}>
                      {formatCurrency(item.winAmount.toString())}
                    </td>
                    <td className="border-b border-[#edf2f7] px-3 py-2.5 text-[13px] text-[#334155] print:px-[1.5mm] print:py-[1.1mm] print:text-[7.9px]">
                      {item.hitLabel ? (
                        <span className="inline-flex rounded-full border border-[#86d19f] bg-[#ecfff2] px-2 py-1 text-[10px] font-medium text-[#1f6f43] print:px-[1mm] print:py-[0.4mm] print:text-[7px]">
                          {item.hitLabel}
                        </span>
                      ) : (
                        <span className="text-[#94a3b8]">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="px-5 pt-0 pb-5 print:px-[5mm] print:pt-0 print:pb-[3.5mm] print:[break-inside:avoid]">
          <div className="overflow-hidden rounded-[18px] border border-[#dbe7f3] bg-[linear-gradient(180deg,#ffffff_0%,#fbfdff_100%)] shadow-[0_12px_30px_rgba(15,23,42,0.04)] print:rounded-[3mm] print:shadow-none">
            <div className="flex items-center justify-between gap-3 border-b border-[#e7eef7] bg-[linear-gradient(180deg,#fbfdff_0%,#f4f8ff_100%)] px-4 py-3 print:px-[2.2mm] print:py-[1.8mm]">
              <h2 className="text-[17px] font-semibold text-[#0f172a] print:text-[11px]">หมายเหตุ</h2>
              <span className="inline-flex rounded-full border border-[#dbe7f3] bg-white px-3 py-1 text-[11px] font-medium text-[#60758d] print:px-[1.5mm] print:py-[0.6mm] print:text-[7.5px]">
                ส่วนลด {formatCurrency(totalDiscount)}
              </span>
            </div>
            <div className="px-4 py-4 text-[13px] leading-6 text-[#334155] print:px-[2.2mm] print:py-[1.8mm] print:text-[8px] print:leading-[1.4]">
              {parsedEntryNote.displayNote || "ไม่มีหมายเหตุ"}
            </div>
          </div>

          <footer className="mt-3 grid grid-cols-[1fr_auto_auto] gap-2 border-t border-[#e2e8f0] px-1 pt-3 text-[11px] text-[#6b7c93] print:mt-[1.8mm] print:px-0 print:pt-[1.5mm] print:text-[7px]">
            <div>พิมพ์เมื่อ {formatDateTime(new Date())}</div>
            <div>{ticket.User_Ticket_customerIdToUser.name}</div>
            <div>{displayName}</div>
          </footer>
        </section>
      </article>
    </div>
  );
}
