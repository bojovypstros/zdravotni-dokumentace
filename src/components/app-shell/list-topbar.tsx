"use client";

import Link from "next/link";

import { LoggedInUser } from "@/components/app-shell/logged-in-user";
import { ThemeToggle } from "@/components/app-shell/theme-toggle";

type Props = {
  title: string;
};

/** Kartotéka / settings shell — no clinical nav, calmer list chrome. */
export function ListTopbar({ title }: Props) {
  return (
    <header
      className="sticky z-30 flex min-h-14 items-center gap-3 border-b border-border bg-surface-muted/60 px-4 backdrop-blur supports-[backdrop-filter]:bg-surface-muted/50 md:gap-4 md:px-6"
      style={{ top: "env(safe-area-inset-top)" }}
    >
      <div className="min-w-0 flex-1">
        <Link
          href="/patients"
          className="text-muted-foreground hover:text-foreground block text-xs no-underline"
        >
          Zdravotní dokumentace
        </Link>
        <h1 className="truncate text-base font-semibold tracking-tight md:text-lg">
          {title}
        </h1>
      </div>
      <div className="flex min-h-14 shrink-0 items-center gap-2 border-l border-border pl-3 md:pl-4">
        <LoggedInUser />
        <ThemeToggle />
      </div>
    </header>
  );
}
