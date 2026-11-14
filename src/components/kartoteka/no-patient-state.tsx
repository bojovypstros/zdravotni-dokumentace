import Link from "next/link";

import { Button } from "@/components/ui/button";

export function NoPatientState({
  title = "Žádný aktivní pacient",
}: {
  title?: string;
}) {
  return (
    <section className="mx-auto max-w-lg space-y-3 rounded-xl border border-dashed border-border bg-surface p-6">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="text-muted-foreground text-sm">
        Otevřete kartotéku, vyberte pacienta nebo založte nový záznam. Pacienti
        nemají vlastní účet — pracuje s nimi personál.
      </p>
      <Button asChild className="min-h-11">
        <Link href="/patients">Přejít do kartotéky</Link>
      </Button>
    </section>
  );
}
