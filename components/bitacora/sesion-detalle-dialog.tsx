"use client";

import { Eye, X } from "lucide-react";
import { useRef } from "react";

import { IconAction } from "@/components/ui/icon-action";
import { formatFecha } from "@/lib/format";
import type { DetalleSesion } from "@/lib/progreso";

/** Icono "ojo" que abre un modal con lo que consideraba la rutina y lo registrado en
 * la bitácora de esa sesión. */
export function SesionDetalleDialog({ detalle }: { detalle: DetalleSesion }) {
  const ref = useRef<HTMLDialogElement>(null);

  return (
    <>
      <IconAction icon={Eye} label="Ver detalle" onClick={() => ref.current?.showModal()} />
      <dialog
        ref={ref}
        onClick={(e) => {
          if (e.target === ref.current) ref.current?.close();
        }}
        className="m-auto w-[min(94vw,720px)] rounded-[12px] border border-border bg-card p-6 text-card-foreground backdrop:bg-black/50"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold">{detalle.rutinaNombre}</h3>
            <p className="text-xs text-muted-foreground">{formatFecha(detalle.fecha)}</p>
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
        <ul className="flex max-h-[70vh] flex-col divide-y divide-border/60 overflow-y-auto text-sm">
          {detalle.filas.map((f, i) => (
            <li key={i} className="py-2">
              <div className="font-medium text-foreground">{f.ejercicio}</div>
              <div className="flex flex-wrap gap-x-4 text-xs text-muted-foreground">
                <span>Rutina: {f.planificado}</span>
                <span>
                  Registro: <span className="text-foreground">{f.realizado}</span>
                </span>
              </div>
              {f.notas && <div className="text-xs text-muted-foreground">{f.notas}</div>}
            </li>
          ))}
        </ul>
      </dialog>
    </>
  );
}
