"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  chartSectionFromHref,
  sectionTone,
} from "@/lib/chart-section-colors";
import { chartNav, profileNavItem } from "@/lib/navigation";
import { cn } from "@/lib/utils";

type Props = {
  patientId: string;
};

export function ChartTopNav({ patientId }: Props) {
  const pathname = usePathname();
  const profileHref = `/patients/${patientId}`;
  const items = [
    ...chartNav.filter((i) => i.desktop !== false),
    { ...profileNavItem, href: profileHref },
  ];

  return (
    <nav
      className="hidden border-b border-border bg-surface md:block"
      aria-label="Navigace dekurzu"
    >
      <ul className="flex gap-1 overflow-x-auto px-4 py-1.5 md:px-6">
        {items.map((item) => {
          const Icon = item.icon;
          const active =
            item.href === profileHref
              ? pathname === profileHref || pathname.startsWith(`${profileHref}/`)
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
          const sectionKey =
            chartSectionFromHref(item.href) ??
            (item.href === profileHref ? "profile" : "overview");
          const tone = sectionTone(sectionKey);
          return (
            <li key={item.href} className="shrink-0">
              <Link
                href={item.href}
                className={cn(
                  "flex min-h-10 items-center gap-2 rounded-md px-2.5 py-1.5 text-sm transition-colors",
                  active ? tone.navActive : tone.navIdle,
                )}
                aria-current={active ? "page" : undefined}
              >
                <span
                  className={cn(
                    "flex size-5 items-center justify-center rounded",
                    active ? "bg-transparent" : tone.iconWell,
                  )}
                  aria-hidden
                >
                  <Icon className="size-3.5 shrink-0" />
                </span>
                <span className="whitespace-nowrap">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
