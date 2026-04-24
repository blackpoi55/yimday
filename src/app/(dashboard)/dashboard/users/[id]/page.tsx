import Link from "next/link";
import { FileText } from "lucide-react";
import { Role } from "@prisma/client";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { requireSession } from "@/lib/auth";
import { buildAgentCustomerWhere } from "@/lib/customer-scope";
import { isDrawAcceptingTickets } from "@/lib/draw-window";
import { roleLabels } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { getTicketRecorderLabel, parseTicketEntryNote } from "@/lib/ticket-entry-source";
import { getTicketLineLabel } from "@/lib/ticket-line";
import { buildTicketDisplayNameMap, getTicketDisplayName, sortByTicketDisplayName } from "@/lib/ticket-display";
import { buildAgentRecordedTicketWhere } from "@/lib/ticket-scope";
import { formatCurrency, formatDateTime } from "@/lib/utils";

type UserDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams?: Promise<{
    ticketId?: string;
  }>;
};

type UserWithTickets = NonNullable<Awaited<ReturnType<typeof getUserWithTickets>>>;
type TicketWithRelations = UserWithTickets["Ticket_Ticket_customerIdToUser"][number];
type AgentHistoryTicket = TicketWithRelations & {
  entryLabel: string;
};

async function getUserWithTickets(id: string, role: Role, sessionUserId?: string) {
  return prisma.user.findFirst({
    where:
      role === Role.ADMIN
        ? { id }
        : {
            id,
            ...(sessionUserId ? buildAgentCustomerWhere(sessionUserId) : {
              role: Role.CUSTOMER,
              isActive: true,
            }),
          },
    include: {
      User: true,
      Ticket_Ticket_customerIdToUser: {
        where: role === Role.AGENT && sessionUserId ? buildAgentRecordedTicketWhere(sessionUserId) : undefined,
        include: {
          Draw: true,
          BetItem: true,
          User_Ticket_agentIdToUser: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });
}

function AgentHistoryPage({
  user,
  selectedTicketId,
}: {
  user: UserWithTickets;
  selectedTicketId?: string;
}) {
  const ticketDisplayNames = buildTicketDisplayNameMap(
    user.Ticket_Ticket_customerIdToUser.map((ticket) => ({
      id: ticket.id,
      customerId: ticket.customerId,
      drawId: ticket.drawId,
      createdAt: ticket.createdAt,
    })),
  );
  const orderedTickets = user.Ticket_Ticket_customerIdToUser
    .map((ticket) => {
      const parsedEntryNote = parseTicketEntryNote(ticket.note);

      return {
        ...ticket,
        entryLabel: getTicketRecorderLabel(ticket.User_Ticket_agentIdToUser.name, parsedEntryNote.isSelfEntry),
      };
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const selectedTicket =
    (selectedTicketId
      ? orderedTickets.find((ticket) => ticket.id === selectedTicketId)
      : null) ?? null;
  const selectedTicketCanEdit = selectedTicket ? isDrawAcceptingTickets(selectedTicket.Draw) : false;

  const groupedDraws = orderedTickets.reduce<
    Array<{
      drawId: string;
      drawName: string;
      tickets: AgentHistoryTicket[];
    }>
  >((groups, ticket) => {
    const existing = groups.find((group) => group.drawId === ticket.drawId);

    if (existing) {
      existing.tickets.push(ticket);
      return groups;
    }

    groups.push({
      drawId: ticket.drawId,
      drawName: ticket.Draw.name,
      tickets: [ticket],
    });

    return groups;
  }, []);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_320px]">
      <section className="panel">
        <div className="panel-header">
          <h1 className="text-xl font-medium">ข้อมูลการแทงโพยของ : {user.name}</h1>
        </div>
        <div className="panel-body">
          {selectedTicket ? (
            <div className="space-y-4">
              <div className="rounded-sm border border-border px-4 py-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="text-base font-medium">{getTicketDisplayName(selectedTicket.id, ticketDisplayNames, selectedTicket.code)}</div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      className="inline-flex min-h-[30px] items-center justify-center gap-2 rounded-[12px] border border-[#cfe0ff] bg-[linear-gradient(180deg,#ffffff_0%,#f4f8ff_100%)] px-3 py-1.5 text-sm font-semibold text-[#155eef] shadow-[0_10px_24px_rgba(21,94,239,0.10)] transition-[transform,box-shadow,border-color,background-color] duration-200 hover:-translate-y-px hover:border-[#9dbdff] hover:bg-[#f8fbff] hover:text-[#0f4ed1]"
                      href={`/reports/tickets/${selectedTicket.id}?print=1`}
                      rel="noreferrer"
                      target="_blank"
                    >
                      <FileText className="size-4" />
                      PDF
                    </Link>
                    {selectedTicketCanEdit ? (
                      <Link href={`/dashboard/tickets/${selectedTicket.id}/edit`}>
                        <Button size="sm">แก้ไขโพย</Button>
                      </Link>
                    ) : (
                      <span className="rounded-sm bg-muted px-3 py-2 text-xs text-muted-foreground">ปิดแก้ไขแล้ว</span>
                    )}
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">
                  {selectedTicket.Draw.name} | {formatDateTime(selectedTicket.createdAt)}
                </div>
                <div className="mt-1 text-sm text-muted-foreground">ผู้บันทึก {selectedTicket.entryLabel}</div>
                <div className="mt-3 grid gap-2 text-sm md:grid-cols-3">
                  <div>ยอดแทงรวม {formatCurrency(selectedTicket.subtotal.toString())}</div>
                  <div>ส่วนลด {formatCurrency(selectedTicket.discount.toString())}</div>
                  <div>สุทธิ {formatCurrency(selectedTicket.total.toString())}</div>
                </div>
              </div>

              <div className="table-shell">
                <table>
                  <thead>
                    <tr>
                      <th>ประเภท</th>
                      <th>เลข</th>
                      <th>จำนวนเงิน</th>
                      <th>ถูกรางวัล</th>
                      <th>ยอดจ่าย</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedTicket.BetItem.map((item) => (
                      <tr key={item.id}>
                        <td>{getTicketLineLabel(item.betType, item.displayType)}</td>
                        <td>{item.number}</td>
                        <td>{formatCurrency(item.amount.toString())}</td>
                        <td>{item.isWinner ? "ถูกรางวัล" : "-"}</td>
                        <td>{formatCurrency(item.winAmount.toString())}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : user.Ticket_Ticket_customerIdToUser.length === 0 ? (
            <p className="text-center text-sm text-[#a94442]">ไม่มีข้อมูลการแทงโพย</p>
          ) : (
            <p className="text-center text-sm text-muted-foreground">เลือกบิลทางขวาเพื่อดูรายละเอียด</p>
          )}
        </div>
      </section>

      <aside className="space-y-4">
        {groupedDraws.length === 0 ? (
          <div className="panel">
            <div className="panel-body text-center text-sm text-[#a94442]">ไม่มีข้อมูลการแทงโพย</div>
          </div>
        ) : (
          groupedDraws.map((draw) => (
            <div key={draw.drawId} className="panel">
              <div className="panel-header">
                <h2 className="text-sm font-medium">งวดประจำวันที่ {draw.drawName}</h2>
              </div>
              <div className="panel-body space-y-2">
                {draw.tickets.map((ticket) => (
                  <div key={ticket.id} className="text-sm">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <Link
                        className={selectedTicket?.id === ticket.id ? "font-medium text-primary underline" : "text-primary underline"}
                        href={`/dashboard/users/${user.id}?ticketId=${ticket.id}`}
                      >
                        {getTicketDisplayName(ticket.id, ticketDisplayNames, ticket.code)}
                      </Link>
                      <span className="text-muted-foreground">| {formatDateTime(ticket.createdAt)}</span>
                      <Link
                        className="inline-flex items-center gap-1 text-xs font-medium text-[#155eef] underline-offset-2 hover:underline"
                        href={`/reports/tickets/${ticket.id}?print=1`}
                        rel="noreferrer"
                        target="_blank"
                      >
                        <FileText className="size-3.5" />
                        PDF
                      </Link>
                    </div>
                    <div className="text-xs text-muted-foreground">ผู้บันทึก {ticket.entryLabel}</div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </aside>
    </div>
  );
}

export default async function UserDetailPage({ params, searchParams }: UserDetailPageProps) {
  const session = await requireSession([Role.ADMIN, Role.AGENT]);
  const { id } = await params;
  const resolvedSearchParams = (await searchParams) ?? {};

  const user = await getUserWithTickets(id, session.role, session.role === Role.AGENT ? session.userId : undefined);

  if (!user) {
    notFound();
  }

  if (session.role === Role.AGENT) {
    return <AgentHistoryPage selectedTicketId={resolvedSearchParams.ticketId} user={user} />;
  }

  const ticketCount = user.Ticket_Ticket_customerIdToUser.length;
  const netTotal = user.Ticket_Ticket_customerIdToUser.reduce((sum, ticket) => sum + Number(ticket.total), 0);
  const winTotal = user.Ticket_Ticket_customerIdToUser.reduce((sum, ticket) => sum + Number(ticket.winAmount), 0);
  const ticketDisplayNames = buildTicketDisplayNameMap(
    user.Ticket_Ticket_customerIdToUser.map((ticket) => ({
      id: ticket.id,
      customerId: ticket.customerId,
      drawId: ticket.drawId,
      createdAt: ticket.createdAt,
    })),
  );
  const orderedTickets = sortByTicketDisplayName(user.Ticket_Ticket_customerIdToUser, ticketDisplayNames);

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="legacy-title">{user.name}</h1>
          <p className="legacy-subtitle">
            {user.role === Role.CUSTOMER
              ? `${roleLabels[user.role]} | ผู้ดูแล ${user.User?.name ?? "-"}`
              : `${roleLabels[user.role]} | ${user.username} | ผู้ดูแล ${user.User?.name ?? "-"}`}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/dashboard/tickets/new?customerId=${user.id}`}>
            <Button>คีย์โพย</Button>
          </Link>
          <Link href={`/dashboard/tickets?customerId=${user.id}`}>
            <Button variant="outline">ดูบิลทั้งหมด</Button>
          </Link>
        </div>
      </section>

      <section className="legacy-grid-2-even">
        <div className="panel">
          <div className="panel-header">
            <h2 className="text-lg font-medium">สรุปลูกค้า</h2>
          </div>
          <div className="panel-body">
            <div className="table-shell">
              <table>
                <tbody>
                  {user.role !== Role.CUSTOMER ? (
                    <tr>
                      <th>รหัส</th>
                      <td>{user.code}</td>
                    </tr>
                  ) : null}
                  <tr>
                    <th>โทรศัพท์</th>
                    <td>{user.phone ?? "-"}</td>
                  </tr>
                  <tr>
                    <th>จำนวนบิล</th>
                    <td>{ticketCount}</td>
                  </tr>
                  <tr>
                    <th>ยอดสุทธิรวม</th>
                    <td>{formatCurrency(netTotal)}</td>
                  </tr>
                  <tr>
                    <th>ยอดถูกรวม</th>
                    <td>{formatCurrency(winTotal)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <h2 className="text-lg font-medium">รายการล่าสุด</h2>
          </div>
          <div className="panel-body space-y-3">
            {orderedTickets.slice(0, 5).map((ticket) => (
              <Link key={ticket.id} className="block rounded-sm border border-border px-3 py-3 hover:bg-muted" href={`/dashboard/tickets/${ticket.id}`}>
                <div className="font-medium">{getTicketDisplayName(ticket.id, ticketDisplayNames, ticket.code)}</div>
                <div className="text-sm text-muted-foreground">
                  {ticket.Draw.name} | {formatDateTime(ticket.createdAt)}
                </div>
                <div className="mt-1 text-sm">สุทธิ {formatCurrency(ticket.total.toString())}</div>
              </Link>
            ))}
            {ticketCount === 0 ? <div className="text-sm text-muted-foreground">ยังไม่มีรายการโพย</div> : null}
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <h2 className="text-lg font-medium">บิลทั้งหมด</h2>
        </div>
        <div className="panel-body">
          <div className="table-shell">
            <table>
              <thead>
                <tr>
                  <th>เลขบิล</th>
                  <th>งวด</th>
                  <th>รายการ</th>
                  <th>สุทธิ</th>
                  <th>ถูกรางวัล</th>
                  <th>วันที่บันทึก</th>
                </tr>
              </thead>
              <tbody>
                {orderedTickets.map((ticket) => (
                  <tr key={ticket.id}>
                    <td>
                      <Link className="text-primary underline" href={`/dashboard/tickets/${ticket.id}`}>
                        {getTicketDisplayName(ticket.id, ticketDisplayNames, ticket.code)}
                      </Link>
                    </td>
                    <td>{ticket.Draw.name}</td>
                    <td>{ticket.BetItem.length}</td>
                    <td>{formatCurrency(ticket.total.toString())}</td>
                    <td>{formatCurrency(ticket.winAmount.toString())}</td>
                    <td>{formatDateTime(ticket.createdAt)}</td>
                  </tr>
                ))}
                {ticketCount === 0 ? (
                  <tr>
                    <td className="text-center text-muted-foreground" colSpan={6}>
                      ยังไม่มีบิลของลูกค้ารายนี้
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
