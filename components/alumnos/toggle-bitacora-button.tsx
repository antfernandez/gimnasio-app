"use client";

import { useTransition } from "react";

import { setPuedeRegistrarBitacora } from "@/app/protected/alumnos/actions";
import { Button } from "@/components/ui/button";

export function ToggleBitacoraButton({
  id,
  puedeRegistrarBitacora,
}: {
  id: string;
  puedeRegistrarBitacora: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  const handleClick = () => {
    startTransition(async () => {
      await setPuedeRegistrarBitacora(id, !puedeRegistrarBitacora);
    });
  };

  return (
    <Button
      type="button"
      variant={puedeRegistrarBitacora ? "outline" : "secondary"}
      size="sm"
      disabled={isPending}
      onClick={handleClick}
    >
      {isPending
        ? "…"
        : puedeRegistrarBitacora
          ? "Quitar registro propio de bitácora"
          : "Permitir registro propio de bitácora"}
    </Button>
  );
}
