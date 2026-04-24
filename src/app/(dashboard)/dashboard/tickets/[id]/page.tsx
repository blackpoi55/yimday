import Link from "next/link";
import { Role } from "@prisma/client";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { betTypeLabels } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { buildTicketDisplayNameMap, getTicketDisplayName } from "@/lib/ticket-display";
import { formatCurrency, formatDateTime } from "@/lib/utils";

type TicketDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function TicketDetailPage({ params }: TicketDetailPageProps) {
  const session = await requireSession();
  const { id } = await params;

  const ticket = await prisma.ticket.findFirst({
    where:
      session.role === Role.ADMIN
        ? { id }
        : session.role === Role.AGENT
          ? { id, agentId: session.userId }
          : { id, customerId: session.userId },
    include: {
      Draw: true,
      BetItem: true,
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

  return (
    <div className="space-y-6">
      <section className="panel">
        <div className="panel-header">
          <div>
            <h1 className="legacy-title">{displayName}</h1>
            <p className="legacy-subtitle">
              {ticket.Draw.name} | ลูกค้า {ticket.User_Ticket_customerIdToUser.name} | พนักงาน {ticket.User_Ticket_agentIdToUser.name}
            </p>
          </div>
          <Link className="legacy-btn-default" href={`/reports/tickets/${ticket.id}?print=1`} rel="noreferrer" target="_blank">
            PDF
          </Link>
        </div>
        <div className="panel-body">
          <div className="legacy-grid-2-even">
            <div className="table-shell">
              <table>
                <tbody>
                  <tr>
                    <th>วันที่บันทึก</th>
                    <td>{formatDateTime(ticket.createdAt)}</td>
                  </tr>
                  <tr>
                    <th>ยอดแทง</th>
                    <td>{formatCurrency(ticket.subtotal.toString())}</td>
                  </tr>
                  <tr>
                    <th>ส่วนลด</th>
                    <td>{formatCurrency(ticket.discount.toString())}</td>
                  </tr>
                  <tr>
                    <th>สุทธิ</th>
                    <td>{formatCurrency(ticket.total.toString())}</td>
                  </tr>
                  <tr>
                    <th>ยอดถูก</th>
                    <td>{formatCurrency(ticket.winAmount.toString())}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="panel">
              <div className="panel-header">
                <h2 className="text-lg font-medium">หมายเหตุ</h2>
              </div>
              <div className="panel-body text-sm text-muted-foreground">{ticket.note || "-"}</div>
            </div>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <h2 className="text-lg font-medium">รายการเลขในบิล</h2>
        </div>
        <div className="panel-body">
          <div className="table-shell">
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
                {ticket.BetItem.map((item) => (
                  <tr key={item.id}>
                    <td>{betTypeLabels[item.betType]}</td>
                    <td className="font-mono text-base">{item.number}</td>
                    <td>{formatCurrency(item.amount.toString())}</td>
                    <td>{formatCurrency(item.payoutRate?.toString() ?? "0")}</td>
                    <td>{formatCurrency(item.winAmount.toString())}</td>
                    <td>{item.hitLabel ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
