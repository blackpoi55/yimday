"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Lock, Menu, X } from "lucide-react";
import { Role } from "@prisma/client";
import { YimdayLogo } from "@/components/brand/yimday-logo";
import { logoutAction } from "@/lib/actions/auth";
import { navigationItems, roleLabels, roleNavLabels, roleNavThemes } from "@/lib/constants";
import type { UserSession } from "@/lib/auth";
import { LiveClock } from "@/components/dashboard/live-clock";
import { cn } from "@/lib/utils";

type DashboardShellProps = {
  children: React.ReactNode;
  session: UserSession;
};

export function DashboardShell({ children, session }: DashboardShellProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const items = navigationItems.filter((item) => item.roles.includes(session.role as Role));
  const navTheme = roleNavThemes[session.role];
  const activeHref =
    items
      .filter((item) => pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(`${item.href}/`)))
      .sort((a, b) => b.href.length - a.href.length)[0]?.href ?? null;

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const brand = (
    <Link className="legacy-navbar-brand" href="/dashboard">
      <span className="legacy-navbar-brand-icon">
        <YimdayLogo size={40} priority className="rounded-2xl" />
      </span>
      <span className="legacy-navbar-brand-text">
        <span className="legacy-navbar-brand-label">Yimday</span>
        <span className="legacy-navbar-brand-meta">
          <span className="legacy-navbar-brand-name">{session.name}</span>
          <span className="legacy-role-badge" title={roleLabels[session.role]}>
            {roleNavLabels[session.role]}
          </span>
        </span>
      </span>
    </Link>
  );

  return (
    <div className="min-h-screen w-full bg-white">
      <nav
        className="legacy-navbar"
        style={
          {
            "--legacy-nav-primary": navTheme.primary,
            "--legacy-nav-secondary": navTheme.secondary,
            "--legacy-nav-border": navTheme.border,
            "--legacy-nav-icon-text": navTheme.iconText,
            "--legacy-nav-surface": navTheme.navSurface,
            "--legacy-logout-surface": navTheme.logoutSurface,
            "--legacy-nav-shadow": navTheme.shadow,
          } as React.CSSProperties
        }
      >
        <div className="legacy-navbar-inner">
          <div className="legacy-navbar-mobile-shell">
            <div className="legacy-navbar-mobile-top">
              {brand}
              <button
                aria-controls="legacy-mobile-nav"
                aria-expanded={mobileMenuOpen}
                aria-label={mobileMenuOpen ? "ปิดเมนู" : "เปิดเมนู"}
                className="legacy-mobile-menu-btn"
                onClick={() => setMobileMenuOpen((open) => !open)}
                type="button"
              >
                {mobileMenuOpen ? <X className="size-[18px]" strokeWidth={2.5} /> : <Menu className="size-[18px]" strokeWidth={2.5} />}
              </button>
            </div>

            {mobileMenuOpen ? (
              <div className="legacy-mobile-menu-panel" id="legacy-mobile-nav">
                <div className="legacy-mobile-clock">
                  <LiveClock />
                </div>

                <div className="legacy-mobile-nav-list">
                  {items.map((item) => {
                    const active = item.href === activeHref;

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn("legacy-mobile-nav-link", active && "active")}
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        {item.label}
                      </Link>
                    );
                  })}
                </div>

                <form action={logoutAction}>
                  <button className="legacy-logout legacy-mobile-logout" type="submit">
                    <Lock className="size-14px" strokeWidth={2.5} />
                    <span>ออกจากระบบ</span>
                  </button>
                </form>
              </div>
            ) : null}
          </div>

          <div className="legacy-navbar-desktop">
            <div className="legacy-navbar-left">
              {brand}

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
        </div>
      </nav>

      <main className="legacy-page">{children}</main>
    </div>
  );
}
