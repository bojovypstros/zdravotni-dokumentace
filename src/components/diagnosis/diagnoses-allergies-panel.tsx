"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { CannotSaveOfflineNotice } from "@/components/pwa/cannot-save-offline";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
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
import { Textarea } from "@/components/ui/textarea";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { apiFetch } from "@/lib/api/client";

type DiagnosisDto = {
  id: string;
  display: string;
  status: string;
  code: string | null;
  notes: string | null;
};

type AllergyDto = {
  id: string;
  substance: string;
  reaction: string | null;
  severity: string;
  status: string;
  verification: string;
};

type Props = {
  patientId: string;
  noKnownAllergies: boolean;
  diagnoses: DiagnosisDto[];
  allergies: AllergyDto[];
};

export function DiagnosesAllergiesPanel({
  patientId,
  noKnownAllergies,
  diagnoses,
  allergies,
}: Props) {
  const router = useRouter();
  const online = useOnlineStatus();
  const [error, setError] = useState<string | null>(null);
  const [diagDisplay, setDiagDisplay] = useState("");
  const [diagNotes, setDiagNotes] = useState("");
  const [substance, setSubstance] = useState("");
  const [reaction, setReaction] = useState("");
  const [verification, setVerification] = useState("patient_reported");
  const [severity, setSeverity] = useState("unknown");
  const [busy, setBusy] = useState(false);

  async function addDiagnosis(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch("/api/diagnoses", {
        method: "POST",
        body: JSON.stringify({
          patientId,
          display: diagDisplay,
          notes: diagNotes,
          status: "active",
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Diagnózu se nepodařilo uložit.");
        return;
      }
      setDiagDisplay("");
      setDiagNotes("");
      router.refresh();
    } catch {
      setError("Server nedostupný – záznam nebyl uložen.");
    } finally {
      setBusy(false);
    }
  }

  async function addAllergy(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch("/api/allergies", {
        method: "POST",
        body: JSON.stringify({
          patientId,
          substance,
          reaction,
          verification,
          severity,
          status: "active",
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Alergii se nepodařilo uložit.");
        return;
      }
      setSubstance("");
      setReaction("");
      router.refresh();
    } catch {
      setError("Server nedostupný – záznam nebyl uložen.");
    } finally {
      setBusy(false);
    }
  }

  async function archiveDiagnosis(id: string) {
    setBusy(true);
    await apiFetch(`/api/diagnoses/${id}`, { method: "DELETE" });
    router.refresh();
    setBusy(false);
  }

  async function archiveAllergy(id: string) {
    setBusy(true);
    await apiFetch(`/api/allergies/${id}`, { method: "DELETE" });
    router.refresh();
    setBusy(false);
  }

  return (
    <div className="space-y-8">
      <CannotSaveOfflineNotice />
      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Chyba</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <section className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-base font-medium">Alergie</h2>
          {noKnownAllergies ? (
            <Badge variant="secondary">Bez známých alergií (NKA)</Badge>
          ) : (
            <Badge variant="outline">NKA nenastaveno</Badge>
          )}
        </div>
        <p className="text-muted-foreground text-sm">
          Záznam alergie s ověřením „unknown“ není totéž jako NKA. Přidání
          alergie automaticky zruší příznak NKA.
        </p>
        <ul className="space-y-2">
          {allergies.length === 0 ? (
            <li className="text-muted-foreground text-sm">Žádné alergie.</li>
          ) : (
            allergies.map((a) => (
              <li
                key={a.id}
                className="flex flex-wrap items-center justify-between gap-2 border-b border-border py-2"
              >
                <div>
                  <div className="font-medium">{a.substance}</div>
                  <div className="text-muted-foreground text-xs">
                    {a.status} · {a.severity} · ověření: {a.verification}
                    {a.reaction ? ` · ${a.reaction}` : ""}
                  </div>
                </div>
                {a.status !== "inactive" ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() => archiveAllergy(a.id)}
                  >
                    Archivovat
                  </Button>
                ) : null}
              </li>
            ))
          )}
        </ul>
        <form className="grid gap-3 sm:grid-cols-2" onSubmit={addAllergy}>
          <div className="space-y-1.5">
            <Label htmlFor="substance">Látka</Label>
            <Input
              id="substance"
              value={substance}
              onChange={(e) => setSubstance(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="reaction">Reakce</Label>
            <Input
              id="reaction"
              value={reaction}
              onChange={(e) => setReaction(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Závažnost</Label>
            <Select value={severity} onValueChange={setSeverity}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mild">Mírná</SelectItem>
                <SelectItem value="moderate">Střední</SelectItem>
                <SelectItem value="severe">Těžká</SelectItem>
                <SelectItem value="unknown">Neznámá</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Ověření</Label>
            <Select value={verification} onValueChange={setVerification}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="patient_reported">Pacient</SelectItem>
                <SelectItem value="confirmed_by_clinician">Klinicky</SelectItem>
                <SelectItem value="unknown">Neznámé</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2">
            <Button
              type="submit"
              disabled={busy || !substance.trim() || !online}
            >
              Přidat alergii
            </Button>
          </div>
        </form>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-medium">Diagnózy</h2>
        <ul className="space-y-2">
          {diagnoses.length === 0 ? (
            <li className="text-muted-foreground text-sm">Žádné diagnózy.</li>
          ) : (
            diagnoses.map((d) => (
              <li
                key={d.id}
                className="flex flex-wrap items-center justify-between gap-2 border-b border-border py-2"
              >
                <div>
                  <div className="font-medium">{d.display}</div>
                  <div className="text-muted-foreground text-xs">
                    {d.status}
                    {d.code ? ` · ${d.code}` : ""}
                    {d.notes ? ` · ${d.notes}` : ""}
                  </div>
                </div>
                {d.status !== "historical" ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() => archiveDiagnosis(d.id)}
                  >
                    Archivovat
                  </Button>
                ) : null}
              </li>
            ))
          )}
        </ul>
        <form className="grid gap-3" onSubmit={addDiagnosis}>
          <div className="space-y-1.5">
            <Label htmlFor="diagDisplay">Název diagnózy</Label>
            <Input
              id="diagDisplay"
              value={diagDisplay}
              onChange={(e) => setDiagDisplay(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="diagNotes">Poznámka</Label>
            <Textarea
              id="diagNotes"
              value={diagNotes}
              onChange={(e) => setDiagNotes(e.target.value)}
            />
          </div>
          <Button
            type="submit"
            disabled={busy || !diagDisplay.trim() || !online}
          >
            Přidat diagnózu
          </Button>
        </form>
      </section>
    </div>
  );
}
