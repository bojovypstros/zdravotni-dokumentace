"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type MeUser = {
  username: string;
  displayName: string | null;
  roleLabel?: string;
};

export function LoggedInUser() {
  const [user, setUser] = useState<MeUser | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/auth/me", { credentials: "same-origin" });
        if (!res.ok) {
          if (!cancelled) setUser(null);
          return;
        }
        const data = (await res.json()) as { user?: MeUser };
        if (!cancelled) setUser(data.user ?? null);
      } catch {
        if (!cancelled) setUser(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (user === undefined) {
    return (
      <span className="text-muted-foreground max-w-[9rem] truncate text-xs">
        …
      </span>
    );
  }
  if (!user) return null;

  const label = user.displayName || user.username;

  return (
    <Link
      href="/settings"
      className="hover:text-foreground text-muted-foreground flex max-w-[11rem] flex-col items-end truncate text-right no-underline"
      title="Účet / nastavení"
    >
      <span className="truncate text-xs font-medium text-foreground">
        {label}
      </span>
      {user.roleLabel ? (
        <span className="truncate text-[10px] leading-tight">
          {user.roleLabel}
        </span>
      ) : null}
    </Link>
  );
}
