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
  const activeHref =
    items
      .filter((item) => pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(`${item.href}/`)))
      .sort((a, b) => b.href.length - a.href.length)[0]?.href ?? null;

  return (
    <div className="min-h-screen w-full bg-white">
      <nav className="legacy-navbar">
        <div className="legacy-navbar-inner">
          <div className="legacy-navbar-left">
            <Link className="legacy-navbar-brand" href="/dashboard">
              <span className="legacy-navbar-brand-icon">
                <User className="size-14px" strokeWidth={2.5} />
              </span>
              <span className="legacy-navbar-brand-text">
                <span className="legacy-navbar-brand-label">Control</span>
                <span className="legacy-navbar-brand-name">{session.name}</span>
              </span>
            </Link>

            <div className="legacy-nav">
              {items.map((item) => {
                const active = item.href === activeHref;

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
              <button className="legacy-logout" type="submit">
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
