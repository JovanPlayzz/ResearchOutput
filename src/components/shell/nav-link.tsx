"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export function NavLink({
  href,
  icon,
  label,
  badge,
  exact = false,
}: {
  href: string;
  icon: ReactNode;
  label: string;
  badge?: number;
  exact?: boolean;
}) {
  const pathname = usePathname();
  const active = exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");
  return (
    <Link href={href} className="nav-tab text-[15px]" data-active={active} aria-current={active ? "page" : undefined} title={label}>
      <span className="nav-icon text-ink-3 [.nav-tab[data-active=true]_&]:text-ink" aria-hidden>
        {icon}
      </span>
      <span className="nav-label flex-1">{label}</span>
      {badge ? (
        <span className="nav-badge rounded-full bg-red px-1.5 py-px font-mono text-[11px] font-medium leading-4 text-paper-2">{badge > 99 ? "99+" : badge}</span>
      ) : null}
    </Link>
  );
}
