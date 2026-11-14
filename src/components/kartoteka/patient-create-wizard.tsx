"use client";

import { useMemo, useState } from "react";

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
import { useOnlineStatus } from "@/hooks/use-online-status";
import { apiFetch } from "@/lib/api/client";
import { PHONE_USE_LABELS, csLabel } from "@/lib/labels/cs";
import { OFFLINE_CANNOT_SAVE_MESSAGE } from "@/lib/network/offline";

const STEPS = [
  { id: "name", title: "Jméno a příjmení" },
  { id: "birth", title: "Datum narození" },
  { id: "contact", title: "Kontakt" },
  { id: "address", title: "Bydliště" },
  { id: "allergies", title: "Alergie" },
  { id: "diagnoses", title: "Onemocnění" },
] as const;

type StepId = (typeof STEPS)[number]["id"];

type AllergyDraft = { key: string; substance: string; reaction: string };
type DiagnosisDraft = { key: string; display: string };

type FormState = {
  givenName: string;
  familyName: string;
  birthDate: string;
  phone: string;
  phoneUse: string;
  email: string;
  emergencyContactName: string;
  emergencyContactRelationship: string;
  emergencyContactPhone: string;
  contactNote: string;
  addressLine: string;
  addressCity: string;
  addressPostalCode: string;
  addressCountry: string;
  noKnownAllergies: boolean;
  allergies: AllergyDraft[];
  diagnoses: DiagnosisDraft[];
};

const emptyForm = (): FormState => ({
  givenName: "",
  familyName: "",
  birthDate: "",
  phone: "",
  phoneUse: "",
  email: "",
  emergencyContactName: "",
  emergencyContactRelationship: "",
  emergencyContactPhone: "",
  contactNote: "",
  addressLine: "",
  addressCity: "",
  addressPostalCode: "",
  addressCountry: "CZ",
  noKnownAllergies: false,
  allergies: [],
  diagnoses: [],
});

function newKey() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

type Props = {
  onCreated: (patientId: string) => Promise<void>;
};

export function PatientCreateWizard({ onCreated }: Props) {
  const online = useOnlineStatus();
  const [stepIndex, setStepIndex] = useState(0);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [allergyDraft, setAllergyDraft] = useState({ substance: "", reaction: "" });
  const [diagnosisDraft, setDiagnosisDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const step = STEPS[stepIndex];
  const isLast = stepIndex === STEPS.length - 1;

  const displayName = useMemo(() => {
    return [form.givenName.trim(), form.familyName.trim()]
      .filter(Boolean)
      .join(" ");
  }, [form.givenName, form.familyName]);

  function patch<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setError(null);
  }

  function canProceed(id: StepId): boolean {
    if (id === "name") {
      return Boolean(form.givenName.trim() && form.familyName.trim());
    }
    if (id === "allergies") {
      if (form.noKnownAllergies) return true;
      // Empty allergy list is allowed (unknown / fill later).
      return true;
    }
    return true;
  }

  function addAllergy() {
    const substance = allergyDraft.substance.trim();
    if (!substance) return;
    patch("noKnownAllergies", false);
    patch("allergies", [
      ...form.allergies,
      {
        key: newKey(),
        substance,
        reaction: allergyDraft.reaction.trim(),
      },
    ]);
    setAllergyDraft({ substance: "", reaction: "" });
  }

  function removeAllergy(key: string) {
    patch(
      "allergies",
      form.allergies.filter((a) => a.key !== key),
    );
  }

  function addDiagnosis() {
    const display = diagnosisDraft.trim();
    if (!display) return;
    patch("diagnoses", [
      ...form.diagnoses,
      { key: newKey(), display },
    ]);
    setDiagnosisDraft("");
  }

  function removeDiagnosis(key: string) {
    patch(
      "diagnoses",
      form.diagnoses.filter((d) => d.key !== key),
    );
  }

  async function submit() {
    if (!online) {
      setError(OFFLINE_CANNOT_SAVE_MESSAGE);
      return;
    }
    if (!displayName) {
      setError("Vyplňte jméno a příjmení.");
      setStepIndex(0);
      return;
    }

    const allergies = form.noKnownAllergies
      ? []
      : form.allergies.filter((a) => a.substance.trim());
    const noKnownAllergies =
      form.noKnownAllergies && allergies.length === 0;

    setSaving(true);
    setError(null);
    try {
      const res = await apiFetch("/api/patients", {
        method: "POST",
        body: JSON.stringify({
          displayName,
          preferredName: form.givenName.trim(),
          givenName: form.givenName.trim(),
          familyName: form.familyName.trim(),
          birthDate: form.birthDate.trim(),
          phone: form.phone.trim(),
          phoneUse: form.phoneUse || null,
          email: form.email.trim(),
          emergencyContactName: form.emergencyContactName.trim(),
          emergencyContactRelationship:
            form.emergencyContactRelationship.trim(),
          emergencyContactPhone: form.emergencyContactPhone.trim(),
          contactNote: form.contactNote.trim(),
          addressLine: form.addressLine.trim(),
          addressCity: form.addressCity.trim(),
          addressPostalCode: form.addressPostalCode.trim(),
          addressCountry: form.addressCountry.trim() || "CZ",
          noKnownAllergies,
        }),
      });
      const data = (await res.json().catch(() => null)) as {
        error?: string;
        patient?: { id: string };
      } | null;
      if (!res.ok || !data?.patient?.id) {
        throw new Error(data?.error ?? "Nepodařilo se vytvořit pacienta.");
      }
      const patientId = data.patient.id;

      for (const allergy of allergies) {
        const aRes = await apiFetch("/api/allergies", {
          method: "POST",
          body: JSON.stringify({
            patientId,
            substance: allergy.substance,
            reaction: allergy.reaction,
            severity: "unknown",
            status: "active",
            verification: "patient_reported",
          }),
        });
        if (!aRes.ok) {
          const aData = (await aRes.json().catch(() => null)) as {
            error?: string;
          } | null;
          throw new Error(
            aData?.error ??
              `Pacient založen, ale alergii „${allergy.substance}“ se nepodařilo uložit.`,
          );
        }
      }

      for (const diagnosis of form.diagnoses.filter((d) => d.display.trim())) {
        const dRes = await apiFetch("/api/diagnoses", {
          method: "POST",
          body: JSON.stringify({
            patientId,
            display: diagnosis.display,
            status: "active",
          }),
        });
        if (!dRes.ok) {
          const dData = (await dRes.json().catch(() => null)) as {
            error?: string;
          } | null;
          throw new Error(
            dData?.error ??
              `Pacient založen, ale onemocnění „${diagnosis.display}“ se nepodařilo uložit.`,
          );
        }
      }

      setForm(emptyForm());
      setAllergyDraft({ substance: "", reaction: "" });
      setDiagnosisDraft("");
      setStepIndex(0);
      await onCreated(patientId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chyba");
    } finally {
      setSaving(false);
    }
  }

  function next() {
    if (!canProceed(step.id)) {
      if (step.id === "name") {
        setError("Vyplňte jméno i příjmení.");
      }
      return;
    }
    setError(null);
    if (isLast) {
      void submit();
      return;
    }
    setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
  }

  function back() {
    setError(null);
    setStepIndex((i) => Math.max(i - 1, 0));
  }

  return (
    <section className="space-y-4 rounded-lg border border-dashed border-border bg-surface/60 p-4">
      <div className="space-y-1">
        <h2 className="text-base font-medium">Nový pacient</h2>
        <p className="text-muted-foreground text-sm">
          Krok {stepIndex + 1} / {STEPS.length}: {step.title}. Po založení se
          otevře dekurz.
        </p>
      </div>

      <ol className="flex flex-wrap gap-1.5" aria-label="Kroky průvodce">
        {STEPS.map((s, i) => {
          const active = i === stepIndex;
          const done = i < stepIndex;
          return (
            <li key={s.id}>
              <button
                type="button"
                className={
                  active
                    ? "rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground"
                    : done
                      ? "rounded-md bg-muted px-2.5 py-1 text-xs font-medium text-foreground"
                      : "rounded-md border border-border px-2.5 py-1 text-xs text-muted-foreground"
                }
                disabled={saving || i > stepIndex}
                onClick={() => {
                  if (i <= stepIndex) setStepIndex(i);
                }}
              >
                {i + 1}. {s.title}
              </button>
            </li>
          );
        })}
      </ol>

      <CannotSaveOfflineNotice />

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Chyba</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="space-y-3">
        {step.id === "name" ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="wizard-given-name">Jméno</Label>
              <Input
                id="wizard-given-name"
                name="wizard-given-name"
                value={form.givenName}
                onChange={(e) => patch("givenName", e.target.value)}
                required
                maxLength={120}
                className="min-h-11"
                autoComplete="off"
                data-1p-ignore
                data-lpignore="true"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wizard-family-name">Příjmení</Label>
              <Input
                id="wizard-family-name"
                name="wizard-family-name"
                value={form.familyName}
                onChange={(e) => patch("familyName", e.target.value)}
                required
                maxLength={120}
                className="min-h-11"
                autoComplete="off"
                data-1p-ignore
                data-lpignore="true"
              />
            </div>
            {displayName ? (
              <p className="text-muted-foreground text-sm sm:col-span-2">
                Zobrazované jméno: {displayName}
              </p>
            ) : null}
          </div>
        ) : null}

        {step.id === "birth" ? (
          <div className="space-y-2">
            <Label htmlFor="wizard-birth-date">Datum narození</Label>
            <Input
              id="wizard-birth-date"
              name="wizard-birth-date"
              type="date"
              value={form.birthDate}
              onChange={(e) => patch("birthDate", e.target.value)}
              className="min-h-11 max-w-xs"
              autoComplete="off"
            />
            <p className="text-muted-foreground text-xs">
              Volitelné — lze doplnit později v profilu.
            </p>
          </div>
        ) : null}

        {step.id === "contact" ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="wizard-phone">Telefon</Label>
              <Input
                id="wizard-phone"
                name="wizard-phone"
                value={form.phone}
                onChange={(e) => patch("phone", e.target.value)}
                className="min-h-11"
                autoComplete="off"
                data-1p-ignore
                data-lpignore="true"
              />
            </div>
            <div className="space-y-2">
              <Label>Typ telefonu</Label>
              <Select
                value={form.phoneUse || undefined}
                onValueChange={(v) => patch("phoneUse", v ?? "")}
              >
                <SelectTrigger className="min-h-11">
                  <SelectValue placeholder="Nevybráno" />
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(PHONE_USE_LABELS).map((key) => (
                    <SelectItem key={key} value={key}>
                      {csLabel(PHONE_USE_LABELS, key)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="wizard-email">E-mail</Label>
              <Input
                id="wizard-email"
                name="wizard-email"
                type="email"
                value={form.email}
                onChange={(e) => patch("email", e.target.value)}
                className="min-h-11"
                autoComplete="off"
                data-1p-ignore
                data-lpignore="true"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wizard-ec-name">Nouzový kontakt — jméno</Label>
              <Input
                id="wizard-ec-name"
                name="wizard-ec-name"
                value={form.emergencyContactName}
                onChange={(e) =>
                  patch("emergencyContactName", e.target.value)
                }
                className="min-h-11"
                autoComplete="off"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wizard-ec-rel">Vztah</Label>
              <Input
                id="wizard-ec-rel"
                name="wizard-ec-rel"
                value={form.emergencyContactRelationship}
                onChange={(e) =>
                  patch("emergencyContactRelationship", e.target.value)
                }
                className="min-h-11"
                autoComplete="off"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="wizard-ec-phone">Telefon nouzového kontaktu</Label>
              <Input
                id="wizard-ec-phone"
                name="wizard-ec-phone"
                value={form.emergencyContactPhone}
                onChange={(e) =>
                  patch("emergencyContactPhone", e.target.value)
                }
                className="min-h-11"
                autoComplete="off"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="wizard-contact-note">Poznámka ke kontaktu</Label>
              <Input
                id="wizard-contact-note"
                name="wizard-contact-note"
                value={form.contactNote}
                onChange={(e) => patch("contactNote", e.target.value)}
                className="min-h-11"
                autoComplete="off"
              />
            </div>
          </div>
        ) : null}

        {step.id === "address" ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="wizard-address-line">Ulice a číslo</Label>
              <Input
                id="wizard-address-line"
                name="wizard-address-line"
                value={form.addressLine}
                onChange={(e) => patch("addressLine", e.target.value)}
                className="min-h-11"
                autoComplete="off"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wizard-address-city">Obec</Label>
              <Input
                id="wizard-address-city"
                name="wizard-address-city"
                value={form.addressCity}
                onChange={(e) => patch("addressCity", e.target.value)}
                className="min-h-11"
                autoComplete="off"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wizard-address-postal">PSČ</Label>
              <Input
                id="wizard-address-postal"
                name="wizard-address-postal"
                value={form.addressPostalCode}
                onChange={(e) => patch("addressPostalCode", e.target.value)}
                className="min-h-11"
                autoComplete="off"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="wizard-address-country">Země</Label>
              <Input
                id="wizard-address-country"
                name="wizard-address-country"
                value={form.addressCountry}
                onChange={(e) => patch("addressCountry", e.target.value)}
                className="min-h-11"
                autoComplete="off"
              />
            </div>
          </div>
        ) : null}

        {step.id === "allergies" ? (
          <div className="space-y-4">
            <label className="flex items-start gap-3 text-sm">
              <Checkbox
                checked={form.noKnownAllergies}
                disabled={form.allergies.length > 0}
                onCheckedChange={(checked) => {
                  const on = checked === true;
                  patch("noKnownAllergies", on);
                  if (on) patch("allergies", []);
                }}
                className="mt-0.5"
              />
              <span>
                Bez známých alergií (NKA)
                {form.allergies.length > 0 ? (
                  <span className="text-muted-foreground block text-xs">
                    Odstraňte položky alergií, než nastavíte NKA.
                  </span>
                ) : (
                  <span className="text-muted-foreground block text-xs">
                    Explicitní NKA ≠ prázdný seznam (neznámý stav).
                  </span>
                )}
              </span>
            </label>

            {!form.noKnownAllergies ? (
              <>
                <ul className="space-y-2">
                  {form.allergies.length === 0 ? (
                    <li className="text-muted-foreground text-sm">
                      Zatím žádná alergie — můžete přeskočit.
                    </li>
                  ) : (
                    form.allergies.map((a) => (
                      <li
                        key={a.key}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border px-3 py-2"
                      >
                        <div>
                          <div className="font-medium">{a.substance}</div>
                          {a.reaction ? (
                            <div className="text-muted-foreground text-xs">
                              {a.reaction}
                            </div>
                          ) : null}
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeAllergy(a.key)}
                        >
                          Odebrat
                        </Button>
                      </li>
                    ))
                  )}
                </ul>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="wizard-allergy-substance">Látka</Label>
                    <Input
                      id="wizard-allergy-substance"
                      value={allergyDraft.substance}
                      onChange={(e) =>
                        setAllergyDraft((d) => ({
                          ...d,
                          substance: e.target.value,
                        }))
                      }
                      className="min-h-11"
                      autoComplete="off"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="wizard-allergy-reaction">Reakce</Label>
                    <Input
                      id="wizard-allergy-reaction"
                      value={allergyDraft.reaction}
                      onChange={(e) =>
                        setAllergyDraft((d) => ({
                          ...d,
                          reaction: e.target.value,
                        }))
                      }
                      className="min-h-11"
                      autoComplete="off"
                    />
                  </div>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  className="min-h-11"
                  disabled={!allergyDraft.substance.trim()}
                  onClick={addAllergy}
                >
                  Přidat alergii
                </Button>
              </>
            ) : null}
          </div>
        ) : null}

        {step.id === "diagnoses" ? (
          <div className="space-y-4">
            <ul className="space-y-2">
              {form.diagnoses.length === 0 ? (
                <li className="text-muted-foreground text-sm">
                  Zatím žádné onemocnění — můžete založit bez něj.
                </li>
              ) : (
                form.diagnoses.map((d) => (
                  <li
                    key={d.key}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border px-3 py-2"
                  >
                    <div className="font-medium">{d.display}</div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeDiagnosis(d.key)}
                    >
                      Odebrat
                    </Button>
                  </li>
                ))
              )}
            </ul>
            <div className="space-y-2">
              <Label htmlFor="wizard-diagnosis-display">Název onemocnění</Label>
              <Input
                id="wizard-diagnosis-display"
                value={diagnosisDraft}
                onChange={(e) => setDiagnosisDraft(e.target.value)}
                className="min-h-11"
                autoComplete="off"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addDiagnosis();
                  }
                }}
              />
            </div>
            <Button
              type="button"
              variant="secondary"
              className="min-h-11"
              disabled={!diagnosisDraft.trim()}
              onClick={addDiagnosis}
            >
              Přidat onemocnění
            </Button>
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2 pt-1">
        <Button
          type="button"
          variant="outline"
          className="min-h-11"
          disabled={stepIndex === 0 || saving}
          onClick={back}
        >
          Zpět
        </Button>
        <Button
          type="button"
          className="min-h-11"
          disabled={!online || saving || !canProceed(step.id)}
          onClick={next}
        >
          {saving
            ? "Ukládám…"
            : isLast
              ? "Založit a otevřít dekurz"
              : "Další"}
        </Button>
      </div>
    </section>
  );
}
