import Link from "next/link";
import { Role } from "@prisma/client";
import { TicketsAdminClient } from "@/components/tickets/tickets-admin-client";
import { Button } from "@/components/ui/button";
import { requireSession } from "@/lib/auth";
import { betTypeLabels } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { buildTicketDisplayNameMap, getTicketDisplayName, sortByTicketDisplayName } from "@/lib/ticket-display";
import { formatCurrency, formatDateTime } from "@/lib/utils";

type TicketsPageProps = {
  searchParams?: Promise<{
    customerId?: string;
  }>;
};

export default async function TicketsPage({ searchParams }: TicketsPageProps) {
  const session = await requireSession();
  const resolvedSearchParams = (await searchParams) ?? {};
  const customerIdFilter = resolvedSearchParams.customerId;

  if (session.role === Role.ADMIN && !customerIdFilter) {
    const draws = await prisma.draw.findMany({
      orderBy: {
        drawDate: "desc",
      },
      include: {
        Ticket: {
          include: {
            BetItem: true,
            User_Ticket_agentIdToUser: true,
            User_Ticket_customerIdToUser: true,
          },
        },
      },
    });

    const ticketDisplayNames = buildTicketDisplayNameMap(
      draws.flatMap((draw) =>
        draw.Ticket.map((ticket) => ({
          id: ticket.id,
          customerId: ticket.customerId,
          drawId: ticket.drawId,
          createdAt: ticket.createdAt,
        })),
      ),
    );

    return (
      <div className="legacy-container">
        <br />
        <h4>ข้อมูลการรับโพย</h4>
        <br />
        <TicketsAdminClient
          draws={draws.map((draw) => {
            const subtotal = draw.Ticket.reduce((sum, ticket) => sum + Number(ticket.subtotal), 0);
            const total = draw.Ticket.reduce((sum, ticket) => sum + Number(ticket.total), 0);
            const customers = Object.values(
              draw.Ticket.reduce<
                Record<
                  string,
                  {
                    customerId: string;
                    customerName: string;
                    subtotal: number;
                    total: number;
                    tickets: {
                      id: string;
                      code: string;
                      displayName: string;
                      customerId: string;
                      customerName: string;
                      agentName: string;
                      subtotal: number;
                      total: number;
                      createdAtLabel: string;
                      note: string | null;
                      items: {
                        id: string;
                        betType: string;
                        number: string;
                        amount: number;
                      }[];
                    }[];
                  }
                >
              >((acc, ticket) => {
                if (!acc[ticket.customerId]) {
                  acc[ticket.customerId] = {
                    customerId: ticket.customerId,
                    customerName: ticket.User_Ticket_customerIdToUser.name,
                    subtotal: 0,
                    total: 0,
                    tickets: [],
                  };
                }

                acc[ticket.customerId].subtotal += Number(ticket.subtotal);
                acc[ticket.customerId].total += Number(ticket.total);
                acc[ticket.customerId].tickets.push({
                  id: ticket.id,
                  code: ticket.code,
                  displayName: getTicketDisplayName(ticket.id, ticketDisplayNames, ticket.code),
                  customerId: ticket.customerId,
                  customerName: ticket.User_Ticket_customerIdToUser.name,
                  agentName: ticket.User_Ticket_agentIdToUser.name,
                  subtotal: Number(ticket.subtotal),
                  total: Number(ticket.total),
                  createdAtLabel: formatDateTime(ticket.createdAt),
                  note: ticket.note,
                  items: ticket.BetItem.map((item) => ({
                    id: item.id,
                    betType: item.betType,
                    number: item.number,
                    amount: Number(item.amount),
                  })),
                });
                acc[ticket.customerId].tickets = sortByTicketDisplayName(acc[ticket.customerId].tickets, ticketDisplayNames);
                return acc;
              }, {}),
            ).sort((a, b) => b.total - a.total);

            return {
              drawId: draw.id,
              drawName: draw.name,
              subtotal,
              total,
              customers,
            };
          })}
        />
      </div>
    );
  }

  const scopedWhere =
    session.role === Role.ADMIN
      ? {}
      : session.role === Role.AGENT
        ? { agentId: session.userId }
        : { customerId: session.userId };

  const where =
    customerIdFilter && session.role !== Role.CUSTOMER
      ? {
          ...scopedWhere,
          customerId: customerIdFilter,
        }
      : scopedWhere;

  const [tickets, selectedCustomer] = await Promise.all([
    prisma.ticket.findMany({
      where,
      orderBy: {
        createdAt: "desc",
      },
      include: {
        Draw: true,
        BetItem: true,
        User_Ticket_agentIdToUser: true,
        User_Ticket_customerIdToUser: true,
      },
    }),
    customerIdFilter
      ? prisma.user.findUnique({
          where: {
            id: customerIdFilter,
          },
        })
      : Promise.resolve(null),
  ]);

  const ticketDisplayNames = buildTicketDisplayNameMap(
    tickets.map((ticket) => ({
      id: ticket.id,
      customerId: ticket.customerId,
      drawId: ticket.drawId,
      createdAt: ticket.createdAt,
    })),
  );
  const groupedTickets = Object.values(
    tickets.reduce<Record<string, { drawName: string; drawId: string; tickets: typeof tickets }>>((acc, ticket) => {
      if (!acc[ticket.drawId]) {
        acc[ticket.drawId] = {
          drawId: ticket.drawId,
          drawName: ticket.Draw.name,
          tickets: [],
        };
      }

      acc[ticket.drawId].tickets.push(ticket);
      return acc;
    }, {}),
  ).map((group) => ({
    ...group,
    tickets: sortByTicketDisplayName(group.tickets, ticketDisplayNames),
  }));

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="legacy-title">โพยและบิล</h1>
          <p className="legacy-subtitle">
            {selectedCustomer ? `กำลังดูของ ${selectedCustomer.name}` : "รายการโพยตามสิทธิ์ผู้ใช้งาน"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {customerIdFilter ? (
            <Link href="/dashboard/tickets">
              <Button variant="outline">ล้างตัวกรอง</Button>
            </Link>
          ) : null}
          {session.role !== Role.CUSTOMER ? (
            <Link href={customerIdFilter ? `/dashboard/tickets/new?customerId=${customerIdFilter}` : "/dashboard/tickets/new"}>
              <Button>คีย์โพยใหม่</Button>
            </Link>
          ) : null}
        </div>
      </section>

      {tickets.length === 0 ? (
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
                        {getTicketDisplayName(ticket.id, ticketDisplayNames, ticket.code)} | {ticket.User_Ticket_customerIdToUser.name} | สุทธิ {formatCurrency(ticket.total.toString())}
                      </summary>
                      <div className="space-y-4 px-3 py-3">
                        <div className="grid gap-3 md:grid-cols-5">
                          <div>
                            <div className="text-xs text-muted-foreground">ลูกค้า</div>
                            <div>{ticket.User_Ticket_customerIdToUser.name}</div>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground">พนักงาน</div>
                            <div>{ticket.User_Ticket_agentIdToUser.name}</div>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground">ยอดสุทธิ</div>
                            <div>{formatCurrency(ticket.total.toString())}</div>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground">ถูกรางวัล</div>
                            <div>{formatCurrency(ticket.winAmount.toString())}</div>
                          </div>
                          <div>
                            <Link className="legacy-btn-default" href={`/dashboard/tickets/${ticket.id}`}>
                              รายละเอียด
                            </Link>
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
                              {ticket.BetItem.map((item) => (
                                <tr key={item.id}>
                                  <td>{betTypeLabels[item.betType]}</td>
                                  <td className="font-mono text-base">{item.number}</td>
                                  <td>{formatCurrency(item.amount.toString())}</td>
                                  <td>{formatCurrency(item.winAmount.toString())}</td>
                                  <td>{item.isWinner ? item.hitLabel : "-"}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        <div className="text-xs text-muted-foreground">บันทึกเมื่อ {formatDateTime(ticket.createdAt)}</div>
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
                        <td>{tickets.length}</td>
                      </tr>
                      <tr>
                        <th>ยอดแทงรวม</th>
                        <td>{formatCurrency(tickets.reduce((sum, ticket) => sum + Number(ticket.subtotal), 0).toString())}</td>
                      </tr>
                      <tr>
                        <th>ยอดสุทธิรวม</th>
                        <td>{formatCurrency(tickets.reduce((sum, ticket) => sum + Number(ticket.total), 0).toString())}</td>
                      </tr>
                      <tr>
                        <th>ยอดถูกรวม</th>
                        <td>{formatCurrency(tickets.reduce((sum, ticket) => sum + Number(ticket.winAmount), 0).toString())}</td>
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
  );
}
