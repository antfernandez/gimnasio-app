"use client";

import { ArchiveRestore, ArchiveX, Pencil } from "lucide-react";
import { useState, useTransition } from "react";

import { darDeBajaRutina, reactivarRutina } from "@/app/protected/rutinas/actions";
import { ConfirmarDialog } from "@/components/ejercicios/confirmar-dialog";
import { IconAction } from "@/components/ui/icon-action";

/** Editar y dar de baja / reactivar una rutina del catálogo. Con alumnos asignados no se
 * puede editar ni dar de baja (iconos deshabilitados con el motivo en el tooltip). */
export function RutinaAcciones({
  id,
  nombre,
  deBaja,
  alumnosAsignados,
}: {
  id: string;
  nombre: string;
  deBaja: boolean;
  alumnosAsignados: number;
}) {
  const [confirmando, setConfirmando] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const bloqueada = alumnosAsignados > 0;
  const motivo = `tiene ${alumnosAsignados} alumno${alumnosAsignados === 1 ? "" : "s"} asignado${alumnosAsignados === 1 ? "" : "s"}`;

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex justify-end gap-1">
        {bloqueada ? (
          <IconAction icon={Pencil} label={`No se puede editar: ${motivo}`} disabled />
        ) : (
          <IconAction icon={Pencil} label="Editar" href={`/protected/rutinas/${id}`} />
        )}
        {deBaja ? (
          <IconAction
            icon={ArchiveRestore}
            label="Reactivar"
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                const r = await reactivarRutina(id);
                setError(r.error ?? null);
              })
            }
          />
        ) : (
          <IconAction
            icon={ArchiveX}
            label={bloqueada ? `No se puede dar de baja: ${motivo}` : "Dar de baja"}
            disabled={bloqueada || isPending}
            onClick={() => setConfirmando(true)}
          />
        )}
      </div>
      {error && <p className="max-w-[16rem] text-xs text-destructive">{error}</p>}
      <ConfirmarDialog
        open={confirmando}
        titulo={`Dar de baja “${nombre}”`}
        descripcion="La rutina deja de ofrecerse para asignar a alumnos. Puedes reactivarla cuando quieras."
        confirmLabel="Dar de baja"
        pendingLabel="Procesando…"
        pending={isPending}
        onCancel={() => setConfirmando(false)}
        onConfirm={() =>
          startTransition(async () => {
            const r = await darDeBajaRutina(id);
            setError(r.error ?? null);
            setConfirmando(false);
          })
        }
      />
    </div>
  );
}
