"use client";

import { ArchiveX, Pencil } from "lucide-react";
import { useState, useTransition } from "react";

import { darDeBajaPlan } from "@/app/protected/planes/actions";
import { ConfirmarDialog } from "@/components/ejercicios/confirmar-dialog";
import { IconAction } from "@/components/ui/icon-action";
import type { EstadoPlan } from "@/lib/planes";

export function PlanAcciones({
  id,
  nombre,
  estado,
  alumnosAsignados,
}: {
  id: string;
  nombre: string;
  estado: EstadoPlan;
  alumnosAsignados: number;
}) {
  const [confirmando, setConfirmando] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const bloqueado = alumnosAsignados > 0;
  const yaDeBaja = estado === "de_baja";
  const etiquetaBaja = bloqueado
    ? `No se puede dar de baja: tiene ${alumnosAsignados} alumno${alumnosAsignados === 1 ? "" : "s"} asignado${alumnosAsignados === 1 ? "" : "s"}`
    : yaDeBaja
      ? "El plan ya está de baja"
      : "Dar de baja";

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex justify-end gap-1">
        <IconAction icon={Pencil} label="Editar" href={`/protected/planes/${id}`} />
        <IconAction
          icon={ArchiveX}
          label={etiquetaBaja}
          disabled={bloqueado || yaDeBaja || isPending}
          onClick={() => setConfirmando(true)}
        />
      </div>
      {error && <p className="max-w-[16rem] text-xs text-destructive">{error}</p>}
      <ConfirmarDialog
        open={confirmando}
        titulo={`Dar de baja “${nombre}”`}
        descripcion="El plan deja de estar vigente desde hoy y no aparecerá para asignar. Puedes reactivarlo editando su vigencia."
        confirmLabel="Dar de baja"
        pendingLabel="Procesando…"
        pending={isPending}
        onCancel={() => setConfirmando(false)}
        onConfirm={() =>
          startTransition(async () => {
            const r = await darDeBajaPlan(id);
            setError(r.error ?? null);
            setConfirmando(false);
          })
        }
      />
    </div>
  );
}
