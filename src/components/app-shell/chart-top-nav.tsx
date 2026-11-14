"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

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
          return (
            <li key={item.href} className="shrink-0">
              <Link
                href={item.href}
                className={cn(
                  "flex min-h-10 items-center gap-2 rounded-md px-2.5 py-1.5 text-sm transition-colors",
                  active
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:bg-surface-muted hover:text-foreground",
                )}
                aria-current={active ? "page" : undefined}
              >
                <Icon className="size-4 shrink-0" aria-hidden />
                <span className="whitespace-nowrap">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
