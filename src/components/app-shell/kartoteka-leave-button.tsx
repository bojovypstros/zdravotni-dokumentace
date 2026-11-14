"use client";

import { FolderOpen } from "lucide-react";

import { useOptionalDirtyNavigation } from "@/components/app-shell/dirty-navigation";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

/** Explicit leave from chart → kartotéka (patient switch always via list). */
export function KartotekaLeaveButton() {
  const router = useRouter();
  const dirty = useOptionalDirtyNavigation();

  function onClick() {
    if (dirty) {
      dirty.requestNavigate("/patients");
      return;
    }
    router.push("/patients");
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="min-h-9 shrink-0 gap-1.5"
      onClick={onClick}
      title="Zpět do kartotéky"
    >
      <FolderOpen className="size-3.5" aria-hidden />
      <span className="hidden sm:inline">Kartotéka</span>
    </Button>
  );
}
