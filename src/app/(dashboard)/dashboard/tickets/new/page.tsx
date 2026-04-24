import Link from "next/link";
import { Role } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { TicketEntry } from "@/components/tickets/ticket-entry";
import { requireSession } from "@/lib/auth";
import { buildAgentCustomerWhere } from "@/lib/customer-scope";
import { getUserCompatSettings } from "@/lib/php-compat-store";
import { compatSettingsFromPayoutProfiles } from "@/lib/php-compat-shared";
import { getPayoutProfiles } from "@/lib/payouts";
import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/utils";

type NewTicketPageProps = {
  searchParams?: Promise<{
    customerId?: string;
    drawId?: string;
  }>;
};

export default async function NewTicketPage({ searchParams }: NewTicketPageProps) {
  const session = await requireSession([Role.ADMIN, Role.AGENT, Role.CUSTOMER]);
  const resolvedSearchParams = (await searchParams) ?? {};
  const requestedCustomerId = resolvedSearchParams.customerId;
  const requestedDrawId = resolvedSearchParams.drawId;
  const ticketRole = session.role === Role.ADMIN ? "ADMIN" : session.role === Role.AGENT ? "AGENT" : "CUSTOMER";
  const now = new Date();

  const [draws, customers, payoutProfiles] = await Promise.all([
    prisma.draw.findMany({
      where: {
        status: "OPEN",
        openAt: {
          lte: now,
        },
        closeAt: {
          gte: now,
        },
      },
      include: {
        BetRate: true,
      },
      orderBy: {
        closeAt: "asc",
      },
    }),
    prisma.user.findMany({
      where:
        session.role === Role.ADMIN
          ? {
              role: Role.CUSTOMER,
              isActive: true,
            }
          : session.role === Role.AGENT
            ? buildAgentCustomerWhere(session.userId)
            : {
                id: session.userId,
              },
      orderBy: {
        name: "asc",
      },
    }),
    getPayoutProfiles(),
  ]);

  const serializedDraws = draws.map((draw) => ({
    id: draw.id,
    name: draw.name,
    closeAt: draw.closeAt.toISOString(),
    rates: draw.BetRate.map((rate) => ({
      betType: rate.betType,
      payout: toNumber(rate.payout),
      commission: toNumber(rate.commission),
      isOpen: rate.isOpen,
    })),
  }));

  const serializedCustomers = customers.map((customer) => ({
    id: customer.id,
    name: customer.name,
    role: customer.role,
  }));

  const serializedPayoutProfiles = payoutProfiles.map((item) => ({
    role: item.role,
    betType: item.betType,
    payout: toNumber(item.payout),
    commission: toNumber(item.commission),
  }));
  const customerSettings = Object.fromEntries(
    await Promise.all(
      customers.map(
        async (customer) =>
          [
            customer.id,
            await getUserCompatSettings(
              customer.id,
              compatSettingsFromPayoutProfiles(
                serializedPayoutProfiles.filter((item) => item.role === customer.role),
              ),
            ),
          ] as const,
      ),
    ),
  );

  const defaultCustomerId =
    (requestedCustomerId &&
    serializedCustomers.some((customer) => customer.id === requestedCustomerId)
      ? requestedCustomerId
      : undefined) ??
    (session.role === Role.CUSTOMER ? session.userId : serializedCustomers[0]?.id);
  const defaultDrawId =
    (requestedDrawId && serializedDraws.some((draw) => draw.id === requestedDrawId) ? requestedDrawId : undefined) ?? serializedDraws[0]?.id;

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="legacy-title">คีย์โพย</h1>
        </div>
        <Link href="/dashboard/tickets">
          <Button variant="outline">กลับไปหน้าบิล</Button>
        </Link>
      </section>

      {serializedDraws.length === 0 ? (
        <div className="panel">
          <div className="panel-body text-center text-sm text-muted-foreground">
            ยังไม่มีงวดที่เปิดรับโพย กรุณาให้ผู้ดูแลระบบสร้างงวดก่อน
          </div>
        </div>
      ) : null}

      {serializedCustomers.length === 0 ? (
        <div className="panel">
          <div className="panel-body text-center text-sm text-muted-foreground">
            ยังไม่มีลูกค้าที่สามารถคีย์โพยได้
          </div>
        </div>
      ) : null}

      {serializedDraws.length > 0 && serializedCustomers.length > 0 ? (
        <TicketEntry
          commissionProfiles={serializedPayoutProfiles}
          customers={serializedCustomers}
          customerSettings={customerSettings}
          defaultCustomerId={defaultCustomerId}
          defaultDrawId={defaultDrawId}
          draws={serializedDraws}
          role={ticketRole}
        />
      ) : null}
    </div>
  );
}
