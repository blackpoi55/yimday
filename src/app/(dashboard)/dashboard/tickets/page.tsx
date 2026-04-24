import { BetType, Role } from "@prisma/client";
import { TicketsAdminClient } from "@/components/tickets/tickets-admin-client";
import { TicketsPageClient } from "@/components/tickets/tickets-page-client";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTicketRecorderLabel, parseTicketEntryNote } from "@/lib/ticket-entry-source";
import { buildTicketDisplayNameMap, getTicketDisplayName, sortByTicketDisplayName } from "@/lib/ticket-display";
import { buildAgentRecordedTicketWhere } from "@/lib/ticket-scope";
import { formatDateTime } from "@/lib/utils";

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
                      entryLabel: string;
                      subtotal: number;
                      discount: number;
                      total: number;
                      createdAtLabel: string;
                      note: string | null;
                      items: {
                        id: string;
                        betType: BetType;
                        displayType: string | null;
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
                const parsedEntryNote = parseTicketEntryNote(ticket.note);
                acc[ticket.customerId].tickets.push({
                  id: ticket.id,
                  code: ticket.code,
                  displayName: getTicketDisplayName(ticket.id, ticketDisplayNames, ticket.code),
                  customerId: ticket.customerId,
                  customerName: ticket.User_Ticket_customerIdToUser.name,
                  entryLabel: getTicketRecorderLabel(ticket.User_Ticket_agentIdToUser.name, parsedEntryNote.isSelfEntry),
                  subtotal: Number(ticket.subtotal),
                  discount: Number(ticket.discount),
                  total: Number(ticket.total),
                  createdAtLabel: formatDateTime(ticket.createdAt),
                  note: parsedEntryNote.displayNote,
                  items: ticket.BetItem.map((item) => ({
                    id: item.id,
                    betType: item.betType,
                    displayType: item.displayType,
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
        ? buildAgentRecordedTicketWhere(session.userId)
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
    drawId: group.drawId,
    drawName: group.drawName,
    tickets: group.tickets
      .slice()
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map((ticket) => {
        const parsedEntryNote = parseTicketEntryNote(ticket.note);

        return {
          id: ticket.id,
          drawId: ticket.drawId,
          drawName: ticket.Draw.name,
          displayName: getTicketDisplayName(ticket.id, ticketDisplayNames, ticket.code),
          customerName: ticket.User_Ticket_customerIdToUser.name,
          entryLabel: getTicketRecorderLabel(ticket.User_Ticket_agentIdToUser.name, parsedEntryNote.isSelfEntry),
          subtotal: Number(ticket.subtotal),
          discount: Number(ticket.discount),
          total: Number(ticket.total),
          winAmount: Number(ticket.winAmount),
          createdAtLabel: formatDateTime(ticket.createdAt),
          note: parsedEntryNote.displayNote,
          items: ticket.BetItem.map((item) => ({
            id: item.id,
            betType: item.betType,
            displayType: item.displayType,
            number: item.number,
            amount: Number(item.amount),
            payoutRate: Number(item.payoutRate ?? 0),
            winAmount: Number(item.winAmount),
            hitLabel: item.hitLabel,
          })),
        };
      }),
  }));

  return (
    <TicketsPageClient
      createTicketHref={session.role === Role.CUSTOMER ? "/dashboard/tickets/new" : customerIdFilter ? `/dashboard/tickets/new?customerId=${customerIdFilter}` : "/dashboard/tickets/new"}
      groupedTickets={groupedTickets}
      selectedCustomerName={selectedCustomer?.name ?? null}
      showClearFilter={Boolean(customerIdFilter)}
    />
  );
}
