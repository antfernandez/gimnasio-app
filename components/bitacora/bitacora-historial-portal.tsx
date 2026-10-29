"use client";

import { useMemo, useState } from "react";

import { Acordeon } from "@/components/ui/acordeon";
import { Input } from "@/components/ui/input";
import { PaginadorLocal } from "@/components/ui/paginador-local";
import { formatFecha } from "@/lib/format";
import { cortarPagina } from "@/lib/paginacion";
import type { RegistroRutina } from "@/lib/types";

type Props = {
  registros: RegistroRutina[];
  /** Nombre de cada rutina por id. */
  rutinas: Record<string, string>;
};

type Sesion = {
  clave: string;
  fecha: string;
  rutinaId: string;
  rutina: string;
  filas: RegistroRutina[];
};

function realizado(r: RegistroRutina): string {
  if (!r.series_realizadas && !r.reps_realizadas && !r.peso_kg) return "—";
  const base = `${r.series_realizadas ?? "—"} × ${r.reps_realizadas ?? "—"}`;
  return r.peso_kg ? `${base} · ${r.peso_kg} kg` : base;
}

/** Spec 33: historial del alumno resumido por sesión (rutina + fecha), con filtros de
 * rango de fechas y rutina; el detalle de ejercicios se abre en un acordeón. */
export function BitacoraHistorialPortal({ registros, rutinas }: Props) {
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [rutinaId, setRutinaId] = useState("");
  const [pagina, setPagina] = useState(1);

  const sesiones = useMemo(() => {
    const mapa = new Map<string, Sesion>();
    for (const r of registros) {
      const clave = `${r.fecha}|${r.rutina_id}`;
      const s = mapa.get(clave) ?? {
        clave,
        fecha: r.fecha,
        rutinaId: r.rutina_id,
        rutina: rutinas[r.rutina_id] ?? "Rutina",
        filas: [],
      };
      s.filas.push(r);
      mapa.set(clave, s);
    }
    return [...mapa.values()]
      .map((s) => ({
        ...s,
        filas: s.filas.sort((a, b) => a.ejercicio_index - b.ejercicio_index),
      }))
      .sort((a, b) => b.fecha.localeCompare(a.fecha));
  }, [registros, rutinas]);

  const visibles = sesiones.filter(
    (s) =>
      (!desde || s.fecha >= desde) &&
      (!hasta || s.fecha <= hasta) &&
      (!rutinaId || s.rutinaId === rutinaId),
  );

  const opcionesRutina = [...new Set(sesiones.map((s) => s.rutinaId))];

  if (sesiones.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        Aún no hay sesiones registradas en la bitácora.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="grid gap-1 text-xs text-muted-foreground">
          Desde
          <Input
            type="date"
            className="h-11 w-full"
            value={desde}
            onChange={(e) => {
              setDesde(e.target.value);
              setPagina(1);
            }}
          />
        </label>
        <label className="grid gap-1 text-xs text-muted-foreground">
          Hasta
          <Input
            type="date"
            className="h-11 w-full"
            value={hasta}
            onChange={(e) => {
              setHasta(e.target.value);
              setPagina(1);
            }}
          />
        </label>
        <label className="grid gap-1 text-xs text-muted-foreground">
          Rutina
          <select
            value={rutinaId}
            onChange={(e) => {
              setRutinaId(e.target.value);
              setPagina(1);
            }}
            className="h-11 w-full rounded-[9px] border border-border bg-white px-3 text-sm text-foreground"
          >
            <option value="">Todas</option>
            {opcionesRutina.map((id) => (
              <option key={id} value={id}>
                {rutinas[id] ?? "Rutina"}
              </option>
            ))}
          </select>
        </label>
      </div>

      {visibles.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">
          No hay sesiones con esos filtros.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {cortarPagina(visibles, pagina).map((s) => (
            <div key={s.clave} className="rounded-[9px] border border-border px-3.5 py-1">
              <Acordeon
                titulo={
                  <div className="flex min-h-11 flex-col justify-center">
                    <span className="font-medium text-foreground">{s.rutina}</span>
                    <span className="text-xs text-muted-foreground">{formatFecha(s.fecha)}</span>
                  </div>
                }
              >
                <ul className="flex flex-col divide-y divide-border/60 pb-3">
                  {s.filas.map((r) => (
                    <li key={r.id} className="py-2 text-sm">
                      <div className="font-medium text-foreground">{r.ejercicio}</div>
                      <div className="text-muted-foreground">{realizado(r)}</div>
                      {r.notas && <div className="text-xs text-muted-foreground">{r.notas}</div>}
                    </li>
                  ))}
                </ul>
              </Acordeon>
            </div>
          ))}
        </div>
      )}

      <PaginadorLocal pagina={pagina} total={visibles.length} onCambiar={setPagina} />
    </div>
  );
}
