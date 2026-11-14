"use client";

/**
 * Legacy topbar kept for reference — list/chart shells use ListTopbar / ChartTopbar.
 * @deprecated
 */
export function Topbar({ title }: { title: string }) {
  return (
    <header className="sticky z-30 flex min-h-14 items-center border-b border-border px-4">
      <h1 className="text-base font-semibold">{title}</h1>
    </header>
  );
}
