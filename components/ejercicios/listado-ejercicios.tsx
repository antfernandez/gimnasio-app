"use client";

import { ChevronDown, Plus } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { BotonLimpiar } from "@/components/ui/boton-limpiar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { Ejercicio, ZonaCuerpo } from "@/lib/types";

function normalizar(s: string) {
  return s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

export function ListadoEjercicios({
  zonas,
  ejercicios,
}: {
  zonas: ZonaCuerpo[];
  ejercicios: Ejercicio[];
}) {
  const [busqueda, setBusqueda] = useState("");
  const [zona, setZona] = useState("");
  const [equipo, setEquipo] = useState("");
  const [estado, setEstado] = useState<"" | "activo" | "inactivo">("");

  const [bBusqueda, setBBusqueda] = useState("");
  const [bZona, setBZona] = useState("");
  const [bEquipo, setBEquipo] = useState("");
  const [bEstado, setBEstado] = useState<"" | "activo" | "inactivo">("");

  const filtrando = Boolean(busqueda || zona || equipo || estado);

  const porZona = useMemo(() => {
    const q = normalizar(busqueda.trim());
    const eq = normalizar(equipo.trim());
    const filtrados = ejercicios.filter((e) => {
      if (zona && e.zona_id !== zona) return false;
      if (q && !normalizar(e.nombre).includes(q)) return false;
      if (eq && !normalizar(e.equipo ?? "").includes(eq)) return false;
      if (estado === "activo" && !e.activo) return false;
      if (estado === "inactivo" && e.activo) return false;
      return true;
    });
    const mapa = new Map<string, Ejercicio[]>();
    for (const e of filtrados) {
      const lista = mapa.get(e.zona_id) ?? [];
      lista.push(e);
      mapa.set(e.zona_id, lista);
    }
    return mapa;
  }, [ejercicios, busqueda, zona, equipo, estado]);

  const totalPorZona = useMemo(() => {
    const mapa = new Map<string, number>();
    for (const e of ejercicios) mapa.set(e.zona_id, (mapa.get(e.zona_id) ?? 0) + 1);
    return mapa;
  }, [ejercicios]);

  // Con filtros activos solo se muestran las zonas con coincidencias; las zonas
  // de sistema vacías aparecen siempre cuando no se filtra (spec §8.0).
  const zonasVisibles = zonas.filter(
    (z) => (porZona.get(z.id)?.length ?? 0) > 0 || (!filtrando && z.es_sistema),
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Input
          placeholder="Buscar por nombre…"
          value={bBusqueda}
          onChange={(e) => setBBusqueda(e.target.value)}
          aria-label="Buscar ejercicio por nombre"
        />
        <Select
          value={bZona}
          onChange={(e) => setBZona(e.target.value)}
          aria-label="Filtrar por zona"
        >
          <option value="">Todas las zonas</option>
          {zonas.map((z) => (
            <option key={z.id} value={z.id}>
              {z.nombre}
            </option>
          ))}
        </Select>
        <Input
          placeholder="Equipo (ej. barra)"
          value={bEquipo}
          onChange={(e) => setBEquipo(e.target.value)}
          aria-label="Filtrar por equipo"
        />
        <Select
          value={bEstado}
          onChange={(e) => setBEstado(e.target.value as typeof bEstado)}
          aria-label="Filtrar por estado"
        >
          <option value="">Activos e inactivos</option>
          <option value="activo">Solo activos</option>
          <option value="inactivo">Solo inactivos</option>
        </Select>
        <div className="flex gap-3 sm:col-span-2 lg:col-span-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setBusqueda(bBusqueda);
              setZona(bZona);
              setEquipo(bEquipo);
              setEstado(bEstado);
            }}
          >
            Filtrar
          </Button>
          <BotonLimpiar
            activo={filtrando}
            onClick={() => {
              setBBusqueda("");
              setBZona("");
              setBEquipo("");
              setBEstado("");
              setBusqueda("");
              setZona("");
              setEquipo("");
              setEstado("");
            }}
          />
        </div>
      </div>

      {zonasVisibles.length === 0 && (
        <p className="py-6 text-center text-sm text-muted-foreground">
          Ningún ejercicio coincide con los filtros.
        </p>
      )}

      {zonasVisibles.map((z) => {
        const lista = porZona.get(z.id) ?? [];
        const total = totalPorZona.get(z.id) ?? 0;
        return (
          <details
            key={z.id}
            open={filtrando || undefined}
            className="group rounded-[9px] border border-border"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3">
              <span className="flex items-center gap-3">
                <span className="font-medium text-foreground">{z.nombre}</span>
                <Badge variant="secondary">
                  {filtrando ? `${lista.length} de ${total}` : total}
                </Badge>
              </span>
              <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
            </summary>
            <div className="border-t border-border">
              {lista.length === 0 ? (
                <p className="px-4 py-4 text-sm text-muted-foreground">
                  {z.nombre === "Personalizados"
                    ? "Aún no hay ejercicios propios."
                    : "Esta zona no tiene ejercicios."}
                </p>
              ) : (
                <ul className="divide-y divide-border">
                  {lista.map((e) => (
                    <li key={e.id}>
                      <Link
                        href={`/protected/ejercicios/${e.id}`}
                        className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-3 hover:bg-primary/5"
                      >
                        <span className="text-sm text-foreground">{e.nombre}</span>
                        <span className="flex items-center gap-2 text-xs text-muted-foreground">
                          {e.equipo}
                          {!e.activo && <Badge variant="outline">Inactivo</Badge>}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              <div className="border-t border-border px-4 py-3">
                <Button asChild variant="ghost" size="sm">
                  <Link href={`/protected/ejercicios/nuevo?zona=${z.id}`}>
                    <Plus className="h-3.5 w-3.5" />
                    Agregar a {z.nombre}
                  </Link>
                </Button>
              </div>
            </div>
          </details>
        );
      })}
    </div>
  );
}
