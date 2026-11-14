"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-[50dvh] max-w-lg flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <h1 className="text-lg font-semibold tracking-tight">
        Něco se pokazilo
      </h1>
      <p className="text-muted-foreground text-sm">
        Obnovte stránku nebo zkuste akci znovu. Pokud problém přetrvá, kontaktujte
        správce.
      </p>
      {error.digest ? (
        <p className="text-muted-foreground font-mono text-xs">
          Kód: {error.digest}
        </p>
      ) : null}
      <Button type="button" onClick={() => reset()}>
        Zkusit znovu
      </Button>
    </main>
  );
}
