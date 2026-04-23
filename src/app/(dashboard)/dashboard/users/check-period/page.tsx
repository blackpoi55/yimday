import { Role } from "@prisma/client";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { buildAgentCustomerWhere } from "@/lib/customer-scope";
import { prisma } from "@/lib/prisma";

type CheckPeriodPageProps = {
  searchParams?: Promise<{
    customerId?: string;
  }>;
};

export default async function CheckPeriodPage({ searchParams }: CheckPeriodPageProps) {
  const session = await requireSession([Role.ADMIN, Role.AGENT]);
  const resolvedSearchParams = (await searchParams) ?? {};
  const customerId = resolvedSearchParams.customerId;

  if (!customerId) {
    redirect("/dashboard/users?error=member-not-found");
  }

  const [customer, openDraw] = await Promise.all([
    prisma.user.findFirst({
      where:
        session.role === Role.ADMIN
          ? {
              id: customerId,
              role: Role.CUSTOMER,
              isActive: true,
            }
          : {
              id: customerId,
              ...buildAgentCustomerWhere(session.userId),
            },
      select: {
        id: true,
      },
    }),
    prisma.draw.findFirst({
      where: {
        status: "OPEN",
      },
      orderBy: {
        closeAt: "asc",
      },
      select: {
        id: true,
      },
    }),
  ]);

  if (!customer) {
    redirect("/dashboard/users?error=member-not-found");
  }

  if (!openDraw) {
    redirect("/dashboard/users?error=draw-closed");
  }

  redirect(`/dashboard/tickets/new?customerId=${customer.id}&drawId=${openDraw.id}`);
}
