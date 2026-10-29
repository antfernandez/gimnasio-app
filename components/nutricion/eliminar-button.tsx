"use client";

import { Trash2 } from "lucide-react";
import { useState, useTransition } from "react";

import type { NutricionFormState } from "@/app/protected/nutricion/actions";
import { ConfirmarDialog } from "@/components/ejercicios/confirmar-dialog";
import { IconAction } from "@/components/ui/icon-action";

/** Icono de eliminar con confirmación; muestra el error de la acción debajo. */
export function EliminarButton({
  nombre,
  entidad,
  accion,
  bloqueadoPor,
}: {
  nombre: string;
  entidad: string;
  accion: () => Promise<NutricionFormState>;
  /** Si se indica, el botón queda deshabilitado y este texto va de tooltip. */
  bloqueadoPor?: string;
}) {
  const [confirmando, setConfirmando] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-end gap-1">
      <IconAction
        icon={Trash2}
        label={bloqueadoPor ?? "Eliminar"}
        disabled={isPending || !!bloqueadoPor}
        onClick={() => setConfirmando(true)}
      />
      {error && <p className="max-w-[16rem] text-xs text-destructive">{error}</p>}
      <ConfirmarDialog
        open={confirmando}
        titulo={`Eliminar ${entidad} “${nombre}”`}
        descripcion="Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
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
