"use client";

import { Check, ChevronsUpDown, Search } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";

import { cn } from "@/lib/utils";

export type EjercicioOpcion = {
  id: string;
  nombre: string;
  zona_id: string;
  equipo: string | null;
  musculo_principal: string | null;
  musculos_secundarios?: string | null;
  ejecucion?: string | null;
};

export type ZonaOpcion = { id: string; nombre: string };

type Props = {
  zonas: ZonaOpcion[];
  ejercicios: EjercicioOpcion[];
  value: string;
  onChange: (id: string) => void;
  /** Texto a mostrar cuando `value` no está entre las opciones (ejercicio
   * desactivado o eliminado del catálogo desde que se guardó la plantilla). */
  etiquetaFallback?: string;
  invalid?: boolean;
};

function normalizar(s: string) {
  return s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

/** Selector con búsqueda de los ejercicios activos del catálogo, agrupados por
 * zona. Reutilizable: no conoce el formulario, solo `value`/`onChange`. */
export function EjercicioCombobox({
  zonas,
  ejercicios,
  value,
  onChange,
  etiquetaFallback,
  invalid,
}: Props) {
  const [abierto, setAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const raiz = useRef<HTMLDivElement>(null);
  const listaId = useId();

  useEffect(() => {
    if (!abierto) return;
    const cerrar = (e: MouseEvent) => {
      if (!raiz.current?.contains(e.target as Node)) setAbierto(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setAbierto(false);
    document.addEventListener("mousedown", cerrar);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", cerrar);
      document.removeEventListener("keydown", esc);
    };
  }, [abierto]);

  const seleccionado = ejercicios.find((e) => e.id === value);

  const grupos = useMemo(() => {
    const q = normalizar(busqueda.trim());
    return zonas
      .map((z) => ({
        zona: z,
        items: ejercicios.filter(
          (e) => e.zona_id === z.id && (!q || normalizar(e.nombre).includes(q)),
        ),
      }))
      .filter((g) => g.items.length > 0);
  }, [zonas, ejercicios, busqueda]);

  const elegir = (id: string) => {
    onChange(id);
    setAbierto(false);
    setBusqueda("");
  };

  return (
    <div ref={raiz} className="relative">
      <button
        type="button"
        role="combobox"
        aria-expanded={abierto}
        aria-controls={listaId}
        onClick={() => setAbierto((a) => !a)}
        className={cn(
          "flex h-11 w-full items-center justify-between gap-2 rounded-[9px] border bg-secondary/40 px-3.5 text-left text-sm transition-colors focus-visible:border-primary focus-visible:outline-none",
          invalid ? "border-destructive" : "border-input",
        )}
      >
        <span
          className={cn(
            "truncate",
            seleccionado || (value && etiquetaFallback)
              ? "text-foreground"
              : "text-muted-foreground",
          )}
        >
          {seleccionado?.nombre ?? (value && etiquetaFallback) ?? "Elige un ejercicio"}
        </span>
        <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground" />
      </button>

      {abierto && (
        <div
          id={listaId}
          className="absolute left-0 right-0 z-30 mt-1 overflow-hidden rounded-[9px] border border-border bg-card shadow-lg"
        >
          <div className="flex items-center gap-2 border-b border-border px-3">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              autoFocus
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar ejercicio…"
              aria-label="Buscar ejercicio"
              className="h-10 w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
          </div>
          <div role="listbox" className="max-h-72 overflow-y-auto py-1">
            {grupos.length === 0 && (
              <p className="px-3 py-3 text-sm text-muted-foreground">
                Ningún ejercicio coincide.
              </p>
            )}
            {grupos.map(({ zona, items }) => (
              <div key={zona.id} role="group" aria-label={zona.nombre}>
                <div className="px-3 pb-1 pt-2 text-[0.7rem] uppercase tracking-wider text-muted-foreground">
                  {zona.nombre}
                </div>
                {items.map((e) => (
                  <button
                    key={e.id}
                    type="button"
                    role="option"
                    aria-selected={e.id === value}
                    onClick={() => elegir(e.id)}
                    className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm text-foreground hover:bg-primary/10"
                  >
                    <span>{e.nombre}</span>
                    {e.id === value && <Check className="h-4 w-4 text-primary" />}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
