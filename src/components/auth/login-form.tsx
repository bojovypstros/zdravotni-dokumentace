"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { apiFetch } from "@/lib/api/client";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const res = await apiFetch("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });
      const data = (await res.json()) as {
        error?: string;
        setupRequired?: boolean;
      };
      if (!res.ok) {
        if (data.setupRequired) {
          router.replace("/setup");
          return;
        }
        setError(data.error ?? "Přihlášení se nezdařilo.");
        return;
      }
      router.replace("/overview");
      router.refresh();
    } catch {
      setError("Server nedostupný – přihlášení se nezdařilo.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Přihlášení</CardTitle>
        <CardDescription>
          Lokální admin účet. Heslo se neukládá do prohlížeče.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error ? (
          <Alert variant="destructive">
            <AlertTitle>Chyba</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        <form className="space-y-3" onSubmit={onSubmit}>
          <div className="space-y-1.5">
            <Label htmlFor="username">Uživatelské jméno</Label>
            <Input
              id="username"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Heslo</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={saving}>
            {saving ? "Ověřuji…" : "Přihlásit"}
          </Button>
        </form>
        <p className="text-muted-foreground text-center text-xs">
          První spuštění?{" "}
          <Link className="underline" href="/setup">
            Setup wizard
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
