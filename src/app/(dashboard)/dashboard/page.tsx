import { Role } from "@prisma/client";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";

export default async function DashboardPage() {
  const session = await requireSession();

  if (session.role === Role.ADMIN) {
    redirect("/dashboard/monitor");
  }

  if (session.role === Role.AGENT) {
    redirect("/dashboard/users");
  }

  redirect("/dashboard/tickets");
}
