import { Role } from "@prisma/client";
import { WinnersPageClient } from "@/components/winners/winners-page-client";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildTicketDisplayNameMap, getTicketDisplayName } from "@/lib/ticket-display";
import { formatDateTime, toNumber } from "@/lib/utils";

export default async function WinnersPage() {
  const session = await requireSession([Role.ADMIN, Role.AGENT]);

  const draws = await prisma.draw.findMany({
    orderBy: {
      drawDate: "desc",
    },
    include: {
      DrawResult: true,
      Ticket: {
        where: {
          winAmount: {
            gt: 0,
          },
          ...(session.role === Role.AGENT
            ? {
                agentId: session.userId,
              }
            : {}),
        },
        orderBy: {
          createdAt: "asc",
        },
        include: {
          User_Ticket_agentIdToUser: {
            select: {
              name: true,
            },
          },
          User_Ticket_customerIdToUser: {
            select: {
              name: true,
            },
          },
          BetItem: {
            where: {
              winAmount: {
                gt: 0,
              },
            },
            orderBy: {
              createdAt: "asc",
            },
          },
        },
      },
    },
  });

  const drawsWithResults = draws.filter((draw) => draw.DrawResult);
  const ticketDisplayNames = buildTicketDisplayNameMap(
    drawsWithResults.flatMap((draw) =>
      draw.Ticket.map((ticket) => ({
        id: ticket.id,
        customerId: ticket.customerId,
        drawId: ticket.drawId,
        createdAt: ticket.createdAt,
      })),
    ),
  );

  return (
    <WinnersPageClient
      canManageResults={session.role === Role.ADMIN}
      scopeNotice={session.role === Role.AGENT ? "แสดงเฉพาะโพยที่คุณเป็นเจ้าของเท่านั้น" : null}
      draws={drawsWithResults.map((draw) => ({
        drawId: draw.id,
        drawName: draw.name,
        notes: draw.DrawResult?.notes ?? null,
        result: {
          top3: draw.DrawResult?.top3 ?? "-",
          top2: draw.DrawResult?.top2 ?? draw.DrawResult?.top3.slice(-2) ?? "-",
          bottom3: draw.DrawResult?.bottom3 ?? "-",
          bottom2: draw.DrawResult?.bottom2 ?? "-",
          front3: draw.DrawResult?.front3 ?? "-",
          back3: draw.DrawResult?.back3 ?? "-",
        },
        winnerCount: draw.Ticket.length,
        totalWinAmount: draw.Ticket.reduce((sum, ticket) => sum + toNumber(ticket.winAmount), 0),
        winners: draw.Ticket.map((ticket) => ({
          ticketId: ticket.id,
          displayName: getTicketDisplayName(ticket.id, ticketDisplayNames, ticket.code),
          customerName: ticket.User_Ticket_customerIdToUser.name,
          agentName: ticket.User_Ticket_agentIdToUser.name,
          createdAtLabel: formatDateTime(ticket.createdAt),
          subtotal: toNumber(ticket.subtotal),
          total: toNumber(ticket.total),
          winAmount: toNumber(ticket.winAmount),
          note: ticket.note,
          hitSummary: [...new Set(ticket.BetItem.map((item) => item.hitLabel).filter((value): value is string => Boolean(value)))],
          winningItems: ticket.BetItem.map((item) => ({
            id: item.id,
            betType: item.betType,
            number: item.number,
            amount: toNumber(item.amount),
            payoutRate: toNumber(item.payoutRate),
            hitLabel: item.hitLabel ?? "-",
            winAmount: toNumber(item.winAmount),
          })),
        })),
      }))}
    />
  );
}
