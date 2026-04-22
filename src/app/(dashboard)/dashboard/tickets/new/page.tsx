import Link from "next/link";
import { Role } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { TicketEntry } from "@/components/tickets/ticket-entry";
import { requireSession } from "@/lib/auth";
import { getUserCompatSettings } from "@/lib/php-compat-store";
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

  const [draws, customers, payoutProfiles] = await Promise.all([
    prisma.draw.findMany({
      where: {
        status: "OPEN",
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
            ? {
                role: Role.CUSTOMER,
                isActive: true,
              }
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
    code: customer.code,
    role: customer.role,
  }));

  const customerSettings = Object.fromEntries(
    await Promise.all(customers.map(async (customer) => [customer.id, await getUserCompatSettings(customer.id)] as const)),
  );

  const serializedPayoutProfiles = payoutProfiles.map((item) => ({
    role: item.role,
    betType: item.betType,
    commission: toNumber(item.commission),
  }));

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
          <p className="legacy-subtitle">จัดหน้าและ flow ให้ใกล้กับ `member_adddata.php` มากที่สุดในโครง App Router ปัจจุบัน</p>
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
