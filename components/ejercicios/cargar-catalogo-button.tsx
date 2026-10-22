"use client";

import { useState, useTransition } from "react";

import { aplicarCatalogoInicial } from "@/app/protected/ejercicios/actions";
import { Button } from "@/components/ui/button";
import { EJERCICIOS_SEED } from "@/lib/ejercicios-seed";

export function CargarCatalogoButton({ label }: { label?: string }) {
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
            const result = await aplicarCatalogoInicial();
            setError(result.error ?? null);
          })
        }
      >
        {isPending
          ? "Cargando…"
          : (label ?? `Cargar catálogo inicial (${EJERCICIOS_SEED.length} ejercicios)`)}
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
