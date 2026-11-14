"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Settings, UserRound } from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  chartSectionFromHref,
  sectionTone,
} from "@/lib/chart-section-colors";
import { chartMobileMoreNav, chartMobilePrimaryNav } from "@/lib/navigation";
import { cn } from "@/lib/utils";

type Props = {
  patientId: string;
};

export function ChartBottomNav({ patientId }: Props) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const profileHref = `/patients/${patientId}`;
  const moreActive =
    chartMobileMoreNav.some(
      (item) =>
        pathname === item.href || pathname.startsWith(`${item.href}/`),
    ) ||
    pathname === profileHref ||
    pathname.startsWith("/settings");

  return (
    <>
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/80 md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        aria-label="Mobilní navigace dekurzu"
      >
        <ul className="grid h-16 grid-cols-5">
          {chartMobilePrimaryNav.map((item) => {
            const Icon = item.icon;
            if (item.href === "#more") {
              return (
                <li key="more" className="flex">
                  <button
                    type="button"
                    className={cn(
                      "flex min-h-11 flex-1 flex-col items-center justify-center gap-0.5 px-1 text-[11px]",
                      moreActive
                        ? "text-primary"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                    aria-expanded={moreOpen}
                    onClick={() => setMoreOpen(true)}
                  >
                    <Icon className="size-5" aria-hidden />
                    <span className="leading-tight">{item.label}</span>
                  </button>
                </li>
              );
            }
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            const sectionKey = chartSectionFromHref(item.href) ?? "overview";
            const tone = sectionTone(sectionKey);
            return (
              <li key={item.href} className="flex">
                <Link
                  href={item.href}
                  className={cn(
                    "flex min-h-11 flex-1 flex-col items-center justify-center gap-0.5 px-1 text-[11px]",
                    active
                      ? cn(tone.fg, "font-medium")
                      : "text-muted-foreground hover:text-foreground",
                  )}
                  aria-current={active ? "page" : undefined}
                >
                  <span
                    className={cn(
                      "flex size-7 items-center justify-center rounded-md",
                      active ? tone.bg : "bg-transparent",
                    )}
                    aria-hidden
                  >
                    <Icon className="size-5" />
                  </span>
                  <span className="leading-tight">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="max-h-[75dvh] rounded-t-xl">
          <SheetHeader>
            <SheetTitle>Další v dekurzu</SheetTitle>
          </SheetHeader>
          <ul className="grid gap-1 px-1 pb-4">
            <li>
              <Link
                href={profileHref}
                className={cn(
                  "flex min-h-11 items-center gap-3 rounded-md px-3 text-sm",
                  sectionTone("profile").navIdle,
                )}
                onClick={() => setMoreOpen(false)}
              >
                <span
                  className={cn(
                    "flex size-8 items-center justify-center rounded-md",
                    sectionTone("profile").iconWell,
                  )}
                  aria-hidden
                >
                  <UserRound className="size-4 shrink-0" />
                </span>
                Profil pacienta
              </Link>
            </li>
            {chartMobileMoreNav.map((item) => {
              const Icon = item.icon;
              const tone = sectionTone(
                chartSectionFromHref(item.href) ?? "overview",
              );
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex min-h-11 items-center gap-3 rounded-md px-3 text-sm",
                      tone.navIdle,
                    )}
                    onClick={() => setMoreOpen(false)}
                  >
                    <span
                      className={cn(
                        "flex size-8 items-center justify-center rounded-md",
                        tone.iconWell,
                      )}
                      aria-hidden
                    >
                      <Icon className="size-4 shrink-0" />
                    </span>
                    {item.label}
                  </Link>
                </li>
              );
            })}
            <li>
              <Link
                href="/settings"
                className="flex min-h-11 items-center gap-3 rounded-md px-3 text-sm hover:bg-surface-muted"
                onClick={() => setMoreOpen(false)}
              >
                <Settings className="size-4 shrink-0" aria-hidden />
                Nastavení
              </Link>
            </li>
          </ul>
        </SheetContent>
      </Sheet>
    </>
  );
}
