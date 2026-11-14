"use client";

import { useCallback, useState } from "react";

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
import { Textarea } from "@/components/ui/textarea";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { apiFetch } from "@/lib/api/client";
import { OFFLINE_CANNOT_SAVE_MESSAGE } from "@/lib/network/offline";

type DocRow = {
  id: string;
  originalFileName: string;
  mimeType: string;
  sizeBytes: number;
  documentType: string;
  uploadedAt: string;
  checksum: string;
};

async function downloadAuthenticated(url: string, fallbackName: string) {
  const res = await apiFetch(url);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  const blob = await res.blob();
  const cd = res.headers.get("content-disposition") || "";
  const match = /filename="([^"]+)"/.exec(cd);
  const name = match?.[1] || fallbackName;
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(objectUrl);
}

export function ExportBackupPanel({
  patientId,
  initialDocuments,
  initialBackups,
}: {
  patientId: string;
  initialDocuments: DocRow[];
  initialBackups: string[];
}) {
  const online = useOnlineStatus();
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [password, setPassword] = useState("");
  const [restorePassword, setRestorePassword] = useState("");
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState("other");
  const [docNotes, setDocNotes] = useState("");
  const [documents, setDocuments] = useState<DocRow[]>(initialDocuments);
  const [backups, setBackups] = useState<string[]>(initialBackups);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const [docsRes, bakRes] = await Promise.all([
      apiFetch(`/api/documents?patientId=${encodeURIComponent(patientId)}`),
      apiFetch("/api/backup"),
    ]);
    if (docsRes.ok) {
      const data = (await docsRes.json()) as { documents: DocRow[] };
      setDocuments(data.documents);
    }
    if (bakRes.ok) {
      const data = (await bakRes.json()) as { backups: string[] };
      setBackups(data.backups);
    }
  }, [patientId]);

  function exportQuery(): string {
    const q = new URLSearchParams({ patientId });
    if (fromDate) q.set("fromDate", fromDate);
    if (toDate) q.set("toDate", toDate);
    return q.toString();
  }

  async function runExport(format: "json" | "csv" | "pdf") {
    if (!online) {
      setError(OFFLINE_CANNOT_SAVE_MESSAGE);
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await downloadAuthenticated(
        `/api/exports/${format}?${exportQuery()}`,
        `export.${format}`,
      );
      setMessage(`Export ${format.toUpperCase()} stažen.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export selhal.");
    } finally {
      setBusy(false);
    }
  }

  async function createBackup() {
    if (!online) {
      setError(OFFLINE_CANNOT_SAVE_MESSAGE);
      return;
    }
    if (password.length < 8) {
      setError("Heslo pro zálohu musí mít alespoň 8 znaků (heslo účtu).");
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await apiFetch("/api/backup", {
        method: "POST",
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setMessage(`Záloha vytvořena: ${data.fileName}`);
      setPassword("");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Záloha selhala.");
    } finally {
      setBusy(false);
    }
  }

  async function restoreBackup() {
    if (!online) {
      setError(OFFLINE_CANNOT_SAVE_MESSAGE);
      return;
    }
    if (!restoreFile || restorePassword.length < 8) {
      setError("Vyberte soubor zálohy a zadejte heslo.");
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const form = new FormData();
      form.set("password", restorePassword);
      form.set("file", restoreFile);
      const res = await apiFetch("/api/backup/restore", {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setMessage(
        `Obnova OK — dokumentů: ${data.restoredDocuments}. ${data.note ?? ""}`,
      );
      setRestorePassword("");
      setRestoreFile(null);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Obnova selhala.");
    } finally {
      setBusy(false);
    }
  }

  async function uploadDocument() {
    if (!online) {
      setError(OFFLINE_CANNOT_SAVE_MESSAGE);
      return;
    }
    if (!uploadFile) {
      setError("Vyberte soubor (PDF/JPEG/PNG, max 10 MiB).");
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const form = new FormData();
      form.set("patientId", patientId);
      form.set("documentType", documentType);
      form.set("notes", docNotes);
      form.set("file", uploadFile);
      const res = await apiFetch("/api/documents", {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setMessage(`Soubor uložen: ${data.document.originalFileName}`);
      setUploadFile(null);
      setDocNotes("");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload selhal.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-8">
      {!online ? <CannotSaveOfflineNotice /> : null}
      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Chyba</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      {message ? (
        <Alert>
          <AlertTitle>Hotovo</AlertTitle>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      ) : null}

      <section className="space-y-3">
        <h3 className="text-sm font-medium">Export</h3>
        <p className="text-muted-foreground text-sm">
          CSV / JSON / PDF výpis včetně metadata (časové pásmo, období, čas
          generování).
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="export-from">Od (datum)</Label>
            <Input
              id="export-from"
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="export-to">Do (datum)</Label>
            <Input
              id="export-to"
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            disabled={!online || busy}
            onClick={() => void runExport("json")}
          >
            JSON
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={!online || busy}
            onClick={() => void runExport("csv")}
          >
            CSV
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={!online || busy}
            onClick={() => void runExport("pdf")}
          >
            PDF výpis
          </Button>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-medium">Soubory pro zálohu / export</h3>
        <p className="text-muted-foreground text-sm">
          Privátní úložiště (PDF/JPEG/PNG, max 10 MiB). Není samostatná agenda
          Dokumenty v navigaci — jen podpora backup/export.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="doc-file">Soubor</Label>
            <Input
              id="doc-file"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
              onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
            />
          </div>
          <div className="space-y-1">
            <Label>Typ</Label>
            <Select value={documentType} onValueChange={setDocumentType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="lab_result">Laboratorní výsledek</SelectItem>
                <SelectItem value="report">Zpráva</SelectItem>
                <SelectItem value="imaging">Zobrazení</SelectItem>
                <SelectItem value="referral">Žádanka</SelectItem>
                <SelectItem value="other">Jiné</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-1">
          <Label htmlFor="doc-notes">Poznámka</Label>
          <Textarea
            id="doc-notes"
            value={docNotes}
            onChange={(e) => setDocNotes(e.target.value)}
            rows={2}
          />
        </div>
        <Button
          type="button"
          disabled={!online || busy}
          onClick={() => void uploadDocument()}
        >
          Nahrát soubor
        </Button>
        <ul className="text-muted-foreground space-y-1 text-sm">
          {documents.length === 0 ? (
            <li>Žádné soubory.</li>
          ) : (
            documents.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center gap-2">
                <span>
                  {d.originalFileName} ({Math.round(d.sizeBytes / 1024)} KiB)
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={!online || busy}
                  onClick={() =>
                    void downloadAuthenticated(
                      `/api/documents/${d.id}/download`,
                      d.originalFileName,
                    ).catch((e) =>
                      setError(
                        e instanceof Error ? e.message : "Stažení selhalo.",
                      ),
                    )
                  }
                >
                  Stáhnout
                </Button>
              </li>
            ))
          )}
        </ul>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-medium">Záloha a obnova (PoC)</h3>
        <p className="text-muted-foreground text-sm">
          Šifrovaná záloha (AES-256-GCM) heslem uživatelského účtu. Obsahuje DB
          dump + soubory dokumentů.
        </p>
        <div className="space-y-1">
          <Label htmlFor="bak-pass">Heslo účtu</Label>
          <Input
            id="bak-pass"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <Button
          type="button"
          disabled={!online || busy}
          onClick={() => void createBackup()}
        >
          Vytvořit zálohu
        </Button>
        <ul className="text-muted-foreground space-y-1 text-sm">
          {backups.length === 0 ? (
            <li>Žádné lokální zálohy.</li>
          ) : (
            backups.map((name) => (
              <li key={name} className="flex flex-wrap items-center gap-2">
                <span className="break-all">{name}</span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={!online || busy}
                  onClick={() =>
                    void downloadAuthenticated(
                      `/api/backup/${encodeURIComponent(name)}/download`,
                      name,
                    ).catch((e) =>
                      setError(
                        e instanceof Error ? e.message : "Stažení selhalo.",
                      ),
                    )
                  }
                >
                  Stáhnout
                </Button>
              </li>
            ))
          )}
        </ul>

        <div className="space-y-1 pt-2">
          <Label htmlFor="restore-file">Soubor .zdbackup</Label>
          <Input
            id="restore-file"
            type="file"
            accept=".zdbackup,application/octet-stream"
            onChange={(e) => setRestoreFile(e.target.files?.[0] ?? null)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="restore-pass">Heslo k dešifrování</Label>
          <Input
            id="restore-pass"
            type="password"
            autoComplete="current-password"
            value={restorePassword}
            onChange={(e) => setRestorePassword(e.target.value)}
          />
        </div>
        <Button
          type="button"
          variant="secondary"
          disabled={!online || busy}
          onClick={() => void restoreBackup()}
        >
          Obnovit dokumenty ze zálohy
        </Button>
      </section>
    </div>
  );
}
