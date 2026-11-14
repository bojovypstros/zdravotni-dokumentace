"use client";

import { ThemeToggle } from "@/components/app-shell/theme-toggle";

type TopbarProps = {
  title: string;
};

export function Topbar({ title }: TopbarProps) {
  return (
    <header
      className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-surface/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-surface/80 md:px-6"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="min-w-0">
        <p className="truncate text-xs text-muted-foreground md:hidden">
          Zdravotní dokumentace
        </p>
        <h1 className="truncate text-base font-semibold tracking-tight md:text-lg">
          {title}
        </h1>
      </div>
      <div className="flex items-center gap-1">
        <ThemeToggle />
      </div>
    </header>
  );
}
