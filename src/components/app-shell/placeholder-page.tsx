import { AppShell } from "@/components/app-shell/app-shell";

type PlaceholderPageProps = {
  title: string;
  description: string;
};

export function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <AppShell title={title}>
      <section className="mx-auto max-w-3xl space-y-3">
        <p className="text-sm text-muted-foreground">{description}</p>
        <div className="rounded-lg border border-border bg-surface p-4 text-sm text-muted-foreground">
          Tato sekce bude doplněna v dalších fázích. Fáze 1 připravuje základ
          aplikace (shell, motiv, databázové napojení).
        </div>
      </section>
    </AppShell>
  );
}
