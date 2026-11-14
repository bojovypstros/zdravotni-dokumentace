"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { CannotSaveOfflineNotice } from "@/components/pwa/cannot-save-offline";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { apiFetch } from "@/lib/api/client";
import { OFFLINE_CANNOT_SAVE_MESSAGE } from "@/lib/network/offline";

export type StaffUserRow = {
  id: string;
  username: string;
  displayName: string | null;
  role: "ADMIN" | "DOCTOR";
  roleLabel: string;
  isActive: boolean;
};

type Props = {
  users: StaffUserRow[];
};

export function StaffPanel({ users }: Props) {
  const router = useRouter();
  const online = useOnlineStatus();
  const [pending, startTransition] = useTransition();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState<"DOCTOR" | "ADMIN">("DOCTOR");
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!online) {
      setError(OFFLINE_CANNOT_SAVE_MESSAGE);
      return;
    }
    setError(null);
    setOk(false);
    try {
      const res = await apiFetch("/api/users", {
        method: "POST",
        body: JSON.stringify({
          username: username.trim(),
          password,
          displayName: displayName.trim() || undefined,
          role,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(data?.error ?? "Nepodařilo se vytvořit účet.");
      }
      setUsername("");
      setPassword("");
      setDisplayName("");
      setRole("DOCTOR");
      setOk(true);
      startTransition(() => router.refresh());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chyba");
    }
  }

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-base font-medium">Personál</h2>
        <p className="text-muted-foreground text-sm">
          Účty jen pro personál. Admin = vrchní lékař; lékař pracuje s
          kartotékou. Pacient nemá účet.
        </p>
      </div>

      <ul className="divide-y divide-border rounded-md border border-border">
        {users.map((u) => (
          <li key={u.id} className="flex items-center justify-between gap-3 p-3">
            <div className="min-w-0">
              <p className="truncate font-medium">
                {u.displayName || u.username}
              </p>
              <p className="text-muted-foreground truncate text-sm">
                {u.username} · {u.roleLabel}
                {!u.isActive ? " · neaktivní" : ""}
              </p>
            </div>
          </li>
        ))}
      </ul>

      <CannotSaveOfflineNotice />
      <form onSubmit={(e) => void onSubmit(e)} className="space-y-3">
        <h3 className="text-sm font-medium">Nový účet personálu</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="staff-username">Uživatelské jméno</Label>
            <Input
              id="staff-username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              minLength={3}
              className="min-h-11"
              autoComplete="off"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="staff-display">Zobrazované jméno</Label>
            <Input
              id="staff-display"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="min-h-11"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="staff-password">Heslo</Label>
            <Input
              id="staff-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={10}
              className="min-h-11"
              autoComplete="new-password"
            />
          </div>
          <div className="space-y-2">
            <Label>Role</Label>
            <Select
              value={role}
              onValueChange={(v) => setRole(v as "DOCTOR" | "ADMIN")}
            >
              <SelectTrigger className="min-h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DOCTOR">Lékař</SelectItem>
                <SelectItem value="ADMIN">Vrchní lékař</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button
          type="submit"
          className="min-h-11"
          disabled={!online || pending}
        >
          Založit účet
        </Button>
      </form>

      {ok ? (
        <Alert>
          <AlertTitle>Hotovo</AlertTitle>
          <AlertDescription>Účet personálu byl vytvořen.</AlertDescription>
        </Alert>
      ) : null}
      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Chyba</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
    </section>
  );
}
