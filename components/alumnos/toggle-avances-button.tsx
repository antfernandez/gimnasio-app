"use client";

import { useTransition } from "react";

import { setPuedeRegistrarAvances } from "@/app/protected/alumnos/actions";
import { Button } from "@/components/ui/button";

export function ToggleAvancesButton({
  id,
  puedeRegistrarAvances,
}: {
  id: string;
  puedeRegistrarAvances: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  const handleClick = () => {
    startTransition(async () => {
      await setPuedeRegistrarAvances(id, !puedeRegistrarAvances);
    });
  };

  return (
    <Button
      type="button"
      variant={puedeRegistrarAvances ? "outline" : "secondary"}
      size="sm"
      disabled={isPending}
      onClick={handleClick}
    >
      {isPending
        ? "…"
        : puedeRegistrarAvances
          ? "Quitar registro propio de avances"
          : "Permitir registro propio de avances"}
    </Button>
  );
}
