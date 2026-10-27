"use client";

import { ArrowDown, ArrowUp, Pencil, Trash2 } from "lucide-react";
import { useActionState, useState, useTransition } from "react";

import {
  crearZona,
  eliminarZona,
  renombrarZona,
  reordenarZonas,
  type CatalogoState,
} from "@/app/protected/ejercicios/actions";
import { ConfirmarDialog } from "@/components/ejercicios/confirmar-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ZonaCuerpo } from "@/lib/types";

function FilaZona({
  zona,
  cantidad,
  primera,
  ultima,
  onError,
}: {
  zona: ZonaCuerpo;
  cantidad: number;
  primera: boolean;
  ultima: boolean;
  onError: (msg: string | null) => void;
}) {
  const [editando, setEditando] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [state, renombrarAction, renombrando] = useActionState(
    async (prev: CatalogoState, formData: FormData) => {
      const r = await renombrarZona(zona.id, prev, formData);
      if (r.ok) setEditando(false);
      return r;
    },
    {},
  );

  const correr = (fn: () => Promise<CatalogoState>) =>
    startTransition(async () => {
      const r = await fn();
      onError(r.error ?? null);
      setConfirmando(false);
    });

  return (
    <li className="flex flex-col gap-2 px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {editando ? (
          <form action={renombrarAction} className="flex flex-1 items-center gap-2">
            <Input name="nombre" defaultValue={zona.nombre} required autoFocus />
            <Button type="submit" size="sm" disabled={renombrando}>
              Guardar
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setEditando(false)}
            >
              Cancelar
            </Button>
          </form>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground">{zona.nombre}</span>
            <span className="text-xs text-muted-foreground">
              {cantidad} {cantidad === 1 ? "ejercicio" : "ejercicios"}
            </span>
          </div>
        )}
        {!editando && (
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={primera || isPending}
              onClick={() => correr(() => reordenarZonas(zona.id, "arriba"))}
              aria-label={`Subir ${zona.nombre}`}
            >
              <ArrowUp className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={ultima || isPending}
              onClick={() => correr(() => reordenarZonas(zona.id, "abajo"))}
              aria-label={`Bajar ${zona.nombre}`}
            >
              <ArrowDown className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setEditando(true)}
              aria-label={`Renombrar ${zona.nombre}`}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={cantidad > 0}
              title={cantidad > 0 ? "No se puede eliminar: tiene ejercicios asociados" : undefined}
              onClick={() => setConfirmando(true)}
              aria-label={`Eliminar ${zona.nombre}`}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      <ConfirmarDialog
        open={confirmando}
        titulo={`Eliminar la zona “${zona.nombre}”`}
        descripcion="La zona está vacía. Esta acción no se puede deshacer."
        confirmLabel="Eliminar zona"
        pending={isPending}
        onCancel={() => setConfirmando(false)}
        onConfirm={() => correr(() => eliminarZona(zona.id))}
      />
    </li>
  );
}

export function ZonasManager({
  zonas,
  cantidades,
}: {
  zonas: ZonaCuerpo[];
  cantidades: Record<string, number>;
}) {
  const [error, setError] = useState<string | null>(null);
  const [state, crearAction, creando] = useActionState(crearZona, {});

  return (
    <div className="flex flex-col gap-5">
      <form key={state.ok ? zonas.length : "form"} action={crearAction} className="flex gap-2">
        <Input name="nombre" placeholder="Nueva zona (ej. Funcional)" required />
        <Button type="submit" disabled={creando}>
          Crear zona
        </Button>
      </form>
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}

      <ul className="divide-y divide-border rounded-[9px] border border-border">
        {zonas.map((z, i) => (
          <FilaZona
            key={z.id}
            zona={z}
            cantidad={cantidades[z.id] ?? 0}
            primera={i === 0}
            ultima={i === zonas.length - 1}
            onError={setError}
          />
        ))}
      </ul>
    </div>
  );
}
