"use client";

import { useState, useTransition } from "react";

import { aplicarPresetValinor } from "@/app/protected/turnos/actions";
import { Button } from "@/components/ui/button";

export function AplicarPresetButton() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-2">
      <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            const result = await aplicarPresetValinor();
            setError(result.error ?? null);
          })
        }
      >
        {isPending ? "Cargando…" : "Usar horario de Valinor Estudio"}
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
