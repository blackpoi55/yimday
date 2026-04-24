import Link from "next/link";
import { Role } from "@prisma/client";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { TicketEntry } from "@/components/tickets/ticket-entry";
import { requireSession } from "@/lib/auth";
import { isDrawAcceptingTickets } from "@/lib/draw-window";
import { getUserCompatSettings } from "@/lib/php-compat-store";
import { compatSettingsFromPayoutProfiles } from "@/lib/php-compat-shared";
import { getPayoutProfiles } from "@/lib/payouts";
import { prisma } from "@/lib/prisma";
import { buildAgentRecordedTicketWhere } from "@/lib/ticket-scope";
import { toNumber } from "@/lib/utils";

type EditTicketPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditTicketPage({ params }: EditTicketPageProps) {
  const session = await requireSession([Role.ADMIN, Role.AGENT]);
  const { id } = await params;

  const ticket = await prisma.ticket.findFirst({
    where:
      session.role === Role.ADMIN
        ? { id }
        : {
            id,
            ...buildAgentRecordedTicketWhere(session.userId),
          },
    include: {
      Draw: {
        include: {
          BetRate: true,
        },
      },
      BetItem: {
        orderBy: {
          createdAt: "asc",
        },
      },
      User_Ticket_customerIdToUser: true,
    },
  });

  if (!ticket) {
    notFound();
  }

  const canEdit = isDrawAcceptingTickets(ticket.Draw);

  if (!canEdit) {
    return (
      <div className="space-y-6">
        <section className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="legacy-title">แก้ไขโพย</h1>
            <p className="legacy-subtitle">
              {ticket.Draw.name} | {ticket.User_Ticket_customerIdToUser.name}
            </p>
          </div>
          <Link href={`/dashboard/users/${ticket.customerId}?ticketId=${ticket.id}`}>
            <Button variant="outline">กลับไปหน้าโพย</Button>
          </Link>
        </section>

        <div className="panel">
          <div className="panel-body text-center text-sm text-[#a94442]">
            งวดนี้ยังไม่อยู่ในช่วงรับโพย หรือปิดรับโพยแล้ว จึงแก้ไขโพยไม่ได้
          </div>
        </div>
      </div>
    );
  }

  const [payoutProfiles, rolePayoutProfiles] = await Promise.all([
    getPayoutProfiles(),
    getPayoutProfiles(ticket.User_Ticket_customerIdToUser.role),
  ]);
  const customerSettings = await getUserCompatSettings(
    ticket.customerId,
    compatSettingsFromPayoutProfiles(
      rolePayoutProfiles.map((item) => ({
        betType: item.betType,
        payout: toNumber(item.payout),
        commission: toNumber(item.commission),
      })),
    ),
  );

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="legacy-title">แก้ไขโพย</h1>
          <p className="legacy-subtitle">
            {ticket.Draw.name} | {ticket.User_Ticket_customerIdToUser.name}
          </p>
        </div>
        <Link href={`/dashboard/users/${ticket.customerId}?ticketId=${ticket.id}`}>
          <Button variant="outline">กลับไปหน้าโพย</Button>
        </Link>
      </section>

      <TicketEntry
        commissionProfiles={payoutProfiles.map((item) => ({
          role: item.role,
          betType: item.betType,
          payout: toNumber(item.payout),
          commission: toNumber(item.commission),
        }))}
        customerSettings={{
          [ticket.customerId]: customerSettings,
        }}
        customers={[
          {
            id: ticket.User_Ticket_customerIdToUser.id,
            name: ticket.User_Ticket_customerIdToUser.name,
            role: ticket.User_Ticket_customerIdToUser.role,
          },
        ]}
        defaultCustomerId={ticket.customerId}
        defaultDrawId={ticket.drawId}
        draws={[
          {
            id: ticket.Draw.id,
            name: ticket.Draw.name,
            closeAt: ticket.Draw.closeAt.toISOString(),
            rates: ticket.Draw.BetRate.map((rate) => ({
              betType: rate.betType,
              payout: toNumber(rate.payout),
              commission: toNumber(rate.commission),
              isOpen: rate.isOpen,
            })),
          },
        ]}
        initialLines={ticket.BetItem.map((item) => ({
          betType: item.betType,
          displayType: item.displayType === "TWO_TOD" ? "TWO_TOD" : item.betType,
          number: item.number,
          amount: toNumber(item.amount),
          source: `${item.number}=${toNumber(item.amount)}`,
        }))}
        initialNote={ticket.note}
        mode="edit"
        role={session.role === Role.ADMIN ? "ADMIN" : "AGENT"}
        ticketId={ticket.id}
      />
    </div>
  );
}
