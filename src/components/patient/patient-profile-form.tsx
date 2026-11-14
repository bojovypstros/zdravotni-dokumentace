"use client";

import { useState } from "react";

import { CannotSaveOfflineNotice } from "@/components/pwa/cannot-save-offline";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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

export type PatientDto = {
  id: string;
  displayName: string;
  givenName: string | null;
  familyName: string | null;
  birthDate: string | null;
  phone: string | null;
  phoneUse: string | null;
  email: string | null;
  addressLine: string | null;
  addressCity: string | null;
  addressPostalCode: string | null;
  addressCountry: string | null;
  emergencyContactName: string | null;
  emergencyContactRelationship: string | null;
  emergencyContactPhone: string | null;
  emergencyContactEmail: string | null;
  contactNote: string | null;
  preferredName: string | null;
  addressForm: string;
  titlePrefix: string | null;
  titleSuffix: string | null;
  salutationOverride: string | null;
  addressGender: string | null;
  defaultWeightKg: number | null;
  noKnownAllergies: boolean;
  timezone: string;
};

type Status = "idle" | "saving" | "saved" | "failed";

export function PatientProfileForm({ patient }: { patient: PatientDto }) {
  const [form, setForm] = useState({
    displayName: patient.displayName,
    givenName: patient.givenName ?? "",
    familyName: patient.familyName ?? "",
    birthDate: patient.birthDate ?? "",
    phone: patient.phone ?? "",
    phoneUse: patient.phoneUse ?? "",
    email: patient.email ?? "",
    addressLine: patient.addressLine ?? "",
    addressCity: patient.addressCity ?? "",
    addressPostalCode: patient.addressPostalCode ?? "",
    addressCountry: patient.addressCountry ?? "CZ",
    emergencyContactName: patient.emergencyContactName ?? "",
    emergencyContactRelationship: patient.emergencyContactRelationship ?? "",
    emergencyContactPhone: patient.emergencyContactPhone ?? "",
    emergencyContactEmail: patient.emergencyContactEmail ?? "",
    contactNote: patient.contactNote ?? "",
    preferredName: patient.preferredName ?? "",
    addressForm: patient.addressForm || "preferred_name",
    titlePrefix: patient.titlePrefix ?? "",
    titleSuffix: patient.titleSuffix ?? "",
    salutationOverride: patient.salutationOverride ?? "",
    addressGender: patient.addressGender ?? "",
    defaultWeightKg:
      patient.defaultWeightKg !== null ? String(patient.defaultWeightKg) : "",
    noKnownAllergies: patient.noKnownAllergies,
    timezone: patient.timezone || "Europe/Prague",
  });
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const online = useOnlineStatus();

  function patch<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setStatus("idle");
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setStatus("saving");
    setError(null);
    try {
      const payload = {
        ...form,
        phoneUse: form.phoneUse || null,
        addressGender: form.addressGender || null,
        defaultWeightKg: form.defaultWeightKg
          ? Number(form.defaultWeightKg)
          : null,
      };
      const res = await apiFetch(`/api/patients/${patient.id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setStatus("failed");
        setError(data.error ?? "Uložení se nezdařilo.");
        return;
      }
      setStatus("saved");
    } catch {
      setStatus("failed");
      setError("Server nedostupný – záznam nebyl uložen.");
    }
  }

  return (
    <form className="space-y-6" onSubmit={onSubmit} autoComplete="off">
      <CannotSaveOfflineNotice />
      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Chyba</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="patient-display-name">Zobrazené jméno</Label>
          <Input
            id="patient-display-name"
            name="patient-display-name"
            value={form.displayName}
            onChange={(e) => patch("displayName", e.target.value)}
            required
            autoComplete="off"
            data-1p-ignore
            data-lpignore="true"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="patient-given-name">Křestní jméno</Label>
          <Input
            id="patient-given-name"
            name="patient-given-name"
            value={form.givenName}
            onChange={(e) => patch("givenName", e.target.value)}
            autoComplete="off"
            data-1p-ignore
            data-lpignore="true"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="patient-family-name">Příjmení</Label>
          <Input
            id="patient-family-name"
            name="patient-family-name"
            value={form.familyName}
            onChange={(e) => patch("familyName", e.target.value)}
            autoComplete="off"
            data-1p-ignore
            data-lpignore="true"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="patient-preferred-name">
            Preferované oslovení (jméno)
          </Label>
          <Input
            id="patient-preferred-name"
            name="patient-preferred-name"
            value={form.preferredName}
            onChange={(e) => patch("preferredName", e.target.value)}
            autoComplete="off"
            data-1p-ignore
            data-lpignore="true"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Forma oslovení</Label>
          <Select
            value={form.addressForm}
            onValueChange={(v) => patch("addressForm", v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Forma oslovení" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="formal_surname">Formálně (pan/paní)</SelectItem>
              <SelectItem value="formal_title">Formálně s titulem</SelectItem>
              <SelectItem value="given_name">Křestním jménem</SelectItem>
              <SelectItem value="preferred_name">Preferovaným jménem</SelectItem>
              <SelectItem value="neutral">Neutrálně</SelectItem>
              <SelectItem value="custom">Vlastní</SelectItem>
              <SelectItem value="en_mr_ms">EN Mr/Ms</SelectItem>
              <SelectItem value="en_first">EN first name</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="titlePrefix">Titul před</Label>
          <Input
            id="titlePrefix"
            value={form.titlePrefix}
            onChange={(e) => patch("titlePrefix", e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="titleSuffix">Titul za</Label>
          <Input
            id="titleSuffix"
            value={form.titleSuffix}
            onChange={(e) => patch("titleSuffix", e.target.value)}
          />
        </div>
        {form.addressForm === "custom" ? (
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="salutationOverride">Vlastní oslovení</Label>
            <Input
              id="salutationOverride"
              value={form.salutationOverride}
              onChange={(e) => patch("salutationOverride", e.target.value)}
            />
          </div>
        ) : null}
        <div className="space-y-1.5">
          <Label htmlFor="defaultWeightKg">Výchozí hmotnost (kg)</Label>
          <Input
            id="defaultWeightKg"
            type="number"
            step="0.1"
            min="0"
            value={form.defaultWeightKg}
            onChange={(e) => patch("defaultWeightKg", e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="birthDate">Datum narození</Label>
          <Input
            id="birthDate"
            type="date"
            value={form.birthDate}
            onChange={(e) => patch("birthDate", e.target.value)}
          />
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <h2 className="text-sm font-medium sm:col-span-2">Kontakt</h2>
        <div className="space-y-1.5">
          <Label htmlFor="phone">Telefon</Label>
          <Input
            id="phone"
            value={form.phone}
            onChange={(e) => patch("phone", e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Typ telefonu</Label>
          <Select
            value={form.phoneUse || undefined}
            onValueChange={(v) => patch("phoneUse", v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Typ" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="mobile">Mobil</SelectItem>
              <SelectItem value="home">Domácí</SelectItem>
              <SelectItem value="work">Práce</SelectItem>
              <SelectItem value="other">Jiné</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="email">E-mail</Label>
          <Input
            id="email"
            type="email"
            value={form.email}
            onChange={(e) => patch("email", e.target.value)}
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="addressLine">Adresa (volitelně)</Label>
          <Input
            id="addressLine"
            value={form.addressLine}
            onChange={(e) => patch("addressLine", e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="addressCity">Obec</Label>
          <Input
            id="addressCity"
            value={form.addressCity}
            onChange={(e) => patch("addressCity", e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="addressPostalCode">PSČ</Label>
          <Input
            id="addressPostalCode"
            value={form.addressPostalCode}
            onChange={(e) => patch("addressPostalCode", e.target.value)}
          />
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <h2 className="text-sm font-medium sm:col-span-2">Nouzový kontakt</h2>
        <div className="space-y-1.5">
          <Label htmlFor="emergencyContactName">Jméno</Label>
          <Input
            id="emergencyContactName"
            value={form.emergencyContactName}
            onChange={(e) => patch("emergencyContactName", e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="emergencyContactRelationship">Vztah</Label>
          <Input
            id="emergencyContactRelationship"
            value={form.emergencyContactRelationship}
            onChange={(e) =>
              patch("emergencyContactRelationship", e.target.value)
            }
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="emergencyContactPhone">Telefon</Label>
          <Input
            id="emergencyContactPhone"
            value={form.emergencyContactPhone}
            onChange={(e) => patch("emergencyContactPhone", e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="emergencyContactEmail">E-mail</Label>
          <Input
            id="emergencyContactEmail"
            type="email"
            value={form.emergencyContactEmail}
            onChange={(e) => patch("emergencyContactEmail", e.target.value)}
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="contactNote">Poznámka ke kontaktu</Label>
          <Textarea
            id="contactNote"
            value={form.contactNote}
            onChange={(e) => patch("contactNote", e.target.value)}
          />
        </div>
      </section>

      <div className="flex items-start gap-2">
        <Checkbox
          id="noKnownAllergies"
          checked={form.noKnownAllergies}
          onCheckedChange={(checked) =>
            patch("noKnownAllergies", checked === true)
          }
        />
        <div>
          <Label htmlFor="noKnownAllergies">Bez známých alergií (NKA)</Label>
          <p className="text-muted-foreground text-xs">
            Explicitní příznak. Není totéž jako alergie s ověřením „unknown“.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={status === "saving" || !online}>
          {status === "saving" ? "Ukládám…" : "Uložit profil"}
        </Button>
        <span
          className={
            online ? "text-muted-foreground text-sm" : "text-destructive text-sm"
          }
          aria-live="polite"
        >
          {!online
            ? OFFLINE_CANNOT_SAVE_MESSAGE
            : status === "saved"
              ? "Uloženo"
              : status === "failed"
                ? "Selhalo"
                : null}
        </span>
      </div>
    </form>
  );
}
