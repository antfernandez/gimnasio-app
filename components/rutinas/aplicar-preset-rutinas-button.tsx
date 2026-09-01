"use client";

import { useState, useTransition } from "react";

import { aplicarPresetRutinas } from "@/app/protected/rutinas/actions";
import { Button } from "@/components/ui/button";

export function AplicarPresetRutinasButton() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-center gap-2">
      <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            const result = await aplicarPresetRutinas();
            setError(result.error ?? null);
          })
        }
      >
        {isPending ? "Cargando…" : "Cargar rutinas de ejemplo"}
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
