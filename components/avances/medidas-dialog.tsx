"use client";

import { Eye, X } from "lucide-react";
import { useRef } from "react";

import { IconAction } from "@/components/ui/icon-action";
import { formatFecha } from "@/lib/format";
import { listarMedidas } from "@/lib/medidas";
import type { MedidasAvance } from "@/lib/types";

type Props = {
  fecha: string;
  pesoKg: number | null;
  medidas: MedidasAvance;
};

/** Icono "ojo" que abre un modal con todas las medidas del registro. No se
 * renderiza si el avance no tiene medidas. */
export function MedidasDialog({ fecha, pesoKg, medidas }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const lista = listarMedidas(medidas);
  if (lista.length === 0) return null;

  return (
    <>
      <IconAction icon={Eye} label="Ver medidas" onClick={() => ref.current?.showModal()} />
      <dialog
        ref={ref}
        onClick={(e) => {
          if (e.target === ref.current) ref.current?.close();
        }}
        className="m-auto w-[min(92vw,420px)] rounded-[12px] border border-border bg-card p-6 text-card-foreground backdrop:bg-black/50"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold">Medidas</h3>
            <p className="text-xs text-muted-foreground">
              {formatFecha(fecha)}
              {pesoKg != null && ` · ${pesoKg} kg`}
            </p>
          </div>
          <button
            type="button"
            aria-label="Cerrar"
            onClick={() => ref.current?.close()}
            className="rounded-full p-1 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
          {lista.map((m) => (
            <div key={m.etiqueta} className="flex justify-between gap-2 border-b border-border/60 pb-1">
              <dt className="text-muted-foreground">{m.etiqueta}</dt>
              <dd className="font-medium">{m.valor} cm</dd>
            </div>
          ))}
        </dl>
      </dialog>
    </>
  );
}
