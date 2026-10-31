"use client";

import { useTransition } from "react";

import { setAlumnoActivo } from "@/app/protected/alumnos/actions";
import { UserCheck, UserX } from "lucide-react";

import { Button } from "@/components/ui/button";
import { IconAction } from "@/components/ui/icon-action";

export function ToggleActivoButton({
  id,
  activo,
  nombreCompleto,
  modoIcono,
}: {
  id: string;
  activo: boolean;
  nombreCompleto: string;
  modoIcono?: boolean;
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

  if (modoIcono) {
    return (
      <IconAction
        icon={activo ? UserX : UserCheck}
        label={activo ? "Dar de baja" : "Reactivar"}
        disabled={isPending}
        onClick={handleClick}
      />
    );
  }

  return (
    <Button
      type="button"
      variant={activo ? "outline" : "secondary"}
      size="sm"
      className={activo ? "border-red-200 bg-red-100 text-red-700 hover:border-red-300 hover:bg-red-200 hover:text-red-800" : undefined}
      disabled={isPending}
      onClick={handleClick}
    >
      {isPending ? "…" : activo ? "Dar de baja" : "Reactivar"}
    </Button>
  );
}
