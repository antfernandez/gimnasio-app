"use client";

import { useTransition } from "react";

import { setAlumnoActivo } from "@/app/protected/alumnos/actions";
import { Button } from "@/components/ui/button";

export function ToggleActivoButton({
  id,
  activo,
  nombreCompleto,
}: {
  id: string;
  activo: boolean;
  nombreCompleto: string;
}) {
  const [isPending, startTransition] = useTransition();

  const handleClick = () => {
    const confirmMsg = activo
      ? `¿Dar de baja a ${nombreCompleto}? Sus datos se conservan y puedes reactivarlo cuando quieras.`
      : `¿Reactivar a ${nombreCompleto}?`;
    if (!window.confirm(confirmMsg)) return;
    startTransition(async () => {
      await setAlumnoActivo(id, !activo);
    });
  };

  return (
    <Button
      type="button"
      variant={activo ? "outline" : "secondary"}
      size="sm"
      disabled={isPending}
      onClick={handleClick}
    >
      {isPending ? "…" : activo ? "Dar de baja" : "Reactivar"}
    </Button>
  );
}
