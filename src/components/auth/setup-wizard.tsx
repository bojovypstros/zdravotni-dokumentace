"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { apiFetch } from "@/lib/api/client";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type SetupWizardProps = {
  readyForSetup: boolean;
  missingEnv: string[];
  env: {
    databaseUrl: boolean;
    sessionSecret: boolean;
    appUrl: boolean;
  };
};

export function SetupWizard({
  readyForSetup,
  missingEnv,
  env,
}: SetupWizardProps) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (password !== passwordConfirm) {
      setError("Hesla se neshodují.");
      return;
    }
    setSaving(true);
    try {
      const res = await apiFetch("/api/auth/setup", {
        method: "POST",
        body: JSON.stringify({
          username,
          password,
          passwordConfirm,
          displayName,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Setup se nezdařil.");
        return;
      }
      // Session created; patients belong in kartotéka after setup.
      router.replace("/patients");
      router.refresh();
    } catch {
      setError("Server nedostupný – záznam nebyl uložen.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>První spuštění</CardTitle>
        <CardDescription>
          Vytvořte účet vrchního lékaře (admin). Pacienty založíte později v
          kartotéce. Env bootstrap čte existující serverové <code>.env</code>{" "}
          (nikdy neukládá secrets do UI).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertTitle>Env bootstrap</AlertTitle>
          <AlertDescription>
            <ul className="mt-2 list-inside list-disc text-sm">
              <li>DATABASE_URL: {env.databaseUrl ? "OK" : "chybí"}</li>
              <li>SESSION_SECRET: {env.sessionSecret ? "OK" : "chybí"}</li>
              <li>APP_URL: {env.appUrl ? "OK" : "chybí"}</li>
            </ul>
            {!readyForSetup ? (
              <p className="mt-2">
                Doplňte: {missingEnv.join(", ")} dle <code>.env.example</code>.
              </p>
            ) : null}
          </AlertDescription>
        </Alert>

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
              minLength={3}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Heslo (min. 10 znaků)</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={10}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="passwordConfirm">Potvrzení hesla</Label>
            <Input
              id="passwordConfirm"
              type="password"
              autoComplete="new-password"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              required
              minLength={10}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="displayName">Zobrazené jméno účtu (volitelné)</Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>
          <Button
            type="submit"
            className="w-full"
            disabled={!readyForSetup || saving}
          >
            {saving ? "Ukládám…" : "Dokončit setup"}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="text-muted-foreground text-xs">
        Heslo se ukládá jako Argon2id. Session cookie: HttpOnly, SameSite=Lax,
        Secure na HTTPS. Pacienti → kartotéka po setupu.
      </CardFooter>
    </Card>
  );
}
