"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Lock, User } from "lucide-react";
import { Role } from "@prisma/client";
import { logoutAction } from "@/lib/actions/auth";
import { navigationItems } from "@/lib/constants";
import type { UserSession } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { LiveClock } from "@/components/dashboard/live-clock";

type DashboardShellProps = {
  children: React.ReactNode;
  session: UserSession;
};

export function DashboardShell({ children, session }: DashboardShellProps) {
  const pathname = usePathname();
  const items = navigationItems.filter((item) => item.roles.includes(session.role as Role));

  return (
    <div className="min-h-screen bg-white">
      <nav className="legacy-navbar">
        <div className="legacy-navbar-inner">
          <div className="legacy-navbar-left">
            <Link className="legacy-navbar-brand" href="/dashboard">
              <User className="size-14px" strokeWidth={2.5} />
              <span> : {session.name}</span>
            </Link>

            <div className="legacy-nav">
              {items.map((item) => {
                const active =
                  pathname === item.href ||
                  (item.href !== "/dashboard" && pathname.startsWith(`${item.href}/`));

                return (
                  <Link key={item.href} href={item.href} className={cn("legacy-nav-link", active && "active")}>
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="legacy-navbar-right">
            <div className="legacy-clock-wrap">
              <LiveClock />
            </div>
            <form action={logoutAction}>
              <button className="legacy-nav-link legacy-logout" type="submit">
                <Lock className="size-14px" strokeWidth={2.5} />
                <span>ออกจากระบบ</span>
              </button>
            </form>
          </div>
        </div>
      </nav>

      <main className="legacy-page">{children}</main>
    </div>
  );
}
