"use client";

import { Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";

import {
  alternarActivoEjercicio,
  eliminarEjercicio,
} from "@/app/protected/ejercicios/actions";
import { ConfirmarDialog } from "@/components/ejercicios/confirmar-dialog";
import { Button } from "@/components/ui/button";

export function EjercicioAcciones({
  id,
  nombre,
  activo,
}: {
  id: string;
  nombre: string;
  activo: boolean;
}) {
  const [confirmando, setConfirmando] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-3">
        <Button asChild size="sm">
          <Link href={`/protected/ejercicios/${id}/editar`}>
            <Pencil className="h-3.5 w-3.5" />
            Editar
          </Link>
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              const r = await alternarActivoEjercicio(id, !activo);
              setError(r.error ?? null);
            })
          }
        >
          {activo ? "Desactivar" : "Activar"}
        </Button>
        <Button
          type="button"
          variant="destructive"
          size="sm"
          onClick={() => setConfirmando(true)}
        >
          <Trash2 className="h-3.5 w-3.5" />
          Eliminar
        </Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <ConfirmarDialog
        open={confirmando}
        titulo={`Eliminar “${nombre}”`}
        descripcion="Las rutinas ya asignadas no cambian: guardan el nombre del ejercicio como copia. Si prefieres conservarlo, desactívalo en vez de eliminarlo."
        confirmLabel="Eliminar ejercicio"
        pending={isPending}
        onCancel={() => setConfirmando(false)}
        onConfirm={() =>
          startTransition(async () => {
            const r = await eliminarEjercicio(id);
            if (r?.error) {
              setError(r.error);
              setConfirmando(false);
            }
          })
        }
      />
    </div>
  );
}
