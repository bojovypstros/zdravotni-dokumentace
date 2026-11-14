"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { apiFetch } from "@/lib/api/client";
import { Button } from "@/components/ui/button";

export function LogoutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onLogout() {
    setBusy(true);
    try {
      await apiFetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.replace("/login");
      router.refresh();
      setBusy(false);
    }
  }

  return (
    <Button type="button" variant="outline" onClick={onLogout} disabled={busy}>
      {busy ? "Odhlasuji…" : "Odhlásit"}
    </Button>
  );
}
