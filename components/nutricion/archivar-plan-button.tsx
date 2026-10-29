"use client";

import { ArchiveX } from "lucide-react";
import { useState, useTransition } from "react";

import type { NutricionFormState } from "@/app/protected/nutricion/actions";
import { ConfirmarDialog } from "@/components/ejercicios/confirmar-dialog";
import { IconAction } from "@/components/ui/icon-action";

/** Un plan asignado no se elimina: se archiva (baja lógica, criterio de spec 15). */
export function ArchivarPlanButton({
  nombre,
  archivado,
  accion,
}: {
  nombre: string;
  archivado: boolean;
  accion: () => Promise<NutricionFormState>;
}) {
  const [confirmando, setConfirmando] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-end gap-1">
      <IconAction
        icon={ArchiveX}
        label={archivado ? "El plan ya está archivado" : "Archivar"}
        disabled={archivado || isPending}
        onClick={() => setConfirmando(true)}
      />
      {error && <p className="max-w-[16rem] text-xs text-destructive">{error}</p>}
      <ConfirmarDialog
        open={confirmando}
        titulo={`Archivar “${nombre}”`}
        descripcion="Un plan archivado ya no se puede asignar. Puedes reactivarlo editando su estado."
        confirmLabel="Archivar"
        pendingLabel="Procesando…"
        pending={isPending}
        onCancel={() => setConfirmando(false)}
        onConfirm={() =>
          startTransition(async () => {
            const r = await accion();
            setError(r.error ?? null);
            setConfirmando(false);
          })
        }
      />
    </div>
  );
}
