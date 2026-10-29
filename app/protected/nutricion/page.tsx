import { Plus } from "lucide-react";
import Link from "next/link";

import { AsignacionAcciones } from "@/components/nutricion/asignacion-acciones";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatFecha } from "@/lib/format";
import {
  ESTADOS_ASIGNACION,
  labelEstadoAsignacion,
  type Asignacion,
  type EstadoAsignacion,
} from "@/lib/nutricion";
import { getPerfilActual } from "@/lib/perfil";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

// Colores de la distribución por estado (tokens del tema; el color no es el único
// canal: cada segmento lleva su etiqueta y porcentaje en la leyenda).
const COLOR_ESTADO: Record<EstadoAsignacion, string> = {
  activo: "bg-success",
  pausado: "bg-primary",
  completado: "bg-secondary-foreground/60",
  cancelado: "bg-destructive/70",
};

const VARIANTE_ESTADO: Record<EstadoAsignacion, "success" | "default" | "secondary" | "destructive"> = {
  activo: "success",
  pausado: "default",
  completado: "secondary",
  cancelado: "destructive",
};

export default async function NutricionPanelPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string; q?: string; asignado?: string }>;
}) {
  const params = await searchParams;
  const perfilData = await getPerfilActual();
  if (!perfilData) return null;

  // Por defecto solo Activos; "todos" desactiva el filtro.
  const verTodos = params.estado === "todos";
  const filtroEstado = verTodos
    ? undefined
    : (ESTADOS_ASIGNACION.find((e) => e.value === params.estado)?.value ?? "activo");
  const q = (params.q ?? "").trim().toLowerCase();

  const supabase = await createClient();
  const gimnasioId = perfilData.perfil.gimnasio_id;
  const [{ data: asignaciones }, { data: alumnos }, { data: planes }] = await Promise.all([
    supabase
      .from("asignaciones_nutricionales")
      .select("*")
      .eq("gimnasio_id", gimnasioId)
      .order("fecha_inicio", { ascending: false }),
    supabase.from("alumnos").select("id, nombres, apellidos").eq("gimnasio_id", gimnasioId),
    supabase.from("planes_nutricionales").select("id, nombre").eq("gimnasio_id", gimnasioId),
  ]);

  const lista = (asignaciones ?? []) as Asignacion[];
  const alumnoPorId = new Map(
    (alumnos ?? []).map((a) => [
      a.id as string,
      { nombre: `${a.nombres} ${a.apellidos}`.trim() },
    ]),
  );
  const planPorId = new Map((planes ?? []).map((p) => [p.id as string, p.nombre as string]));

  const total = lista.length;
  const conteo = Object.fromEntries(
    ESTADOS_ASIGNACION.map((e) => [e.value, lista.filter((a) => a.estado === e.value).length]),
  ) as Record<EstadoAsignacion, number>;
  const pct = (n: number) => (total ? Math.round((n / total) * 100) : 0);

  const nombreDe = (a: Asignacion) => alumnoPorId.get(a.alumno_id)?.nombre ?? "";
  const visibles = lista
    .filter((a) => {
      if (filtroEstado && a.estado !== filtroEstado) return false;
      return !q || nombreDe(a).toLowerCase().includes(q);
    })
    .sort((a, b) => nombreDe(a).localeCompare(nombreDe(b), "es"));

  return (
    <div className="flex flex-col gap-6">
      {params.asignado === "1" && (
        <div className="rounded-[9px] border border-success/35 bg-success/10 px-4 py-3 text-sm text-success">
          Alumno asignado correctamente.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {ESTADOS_ASIGNACION.map((e) => (
          <Link
            key={e.value}
            href={`/protected/nutricion?estado=${e.value}`}
            className={cn(
              "rounded-[9px] border bg-card px-5 py-4 transition-colors hover:border-primary",
              filtroEstado === e.value ? "border-primary" : "border-border",
            )}
          >
            <div className="text-xs uppercase tracking-wide text-muted-foreground">{e.label}s</div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="font-display text-3xl text-foreground">{conteo[e.value]}</span>
              <span className="text-sm text-muted-foreground">{pct(conteo[e.value])} %</span>
            </div>
          </Link>
        ))}
      </div>

      <Card>
        <CardContent className="pt-6">
          <h3 className="mb-3 text-base">Distribución por estado</h3>
          {total === 0 ? (
            <p className="py-4 text-sm text-muted-foreground">Sin datos aún.</p>
          ) : (
            <>
              <div
                className="flex h-4 w-full overflow-hidden rounded-full bg-secondary"
                role="img"
                aria-label={ESTADOS_ASIGNACION.map((e) => `${e.label}: ${pct(conteo[e.value])} %`).join(", ")}
              >
                {ESTADOS_ASIGNACION.map(
                  (e) =>
                    conteo[e.value] > 0 && (
                      <div
                        key={e.value}
                        className={COLOR_ESTADO[e.value]}
                        style={{ width: `${(conteo[e.value] / total) * 100}%` }}
                      />
                    ),
                )}
              </div>
              <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
                {ESTADOS_ASIGNACION.map((e) => (
                  <li key={e.value} className="flex items-center gap-2">
                    <span className={cn("h-2.5 w-2.5 rounded-full", COLOR_ESTADO[e.value])} />
                    {e.label}: {conteo[e.value]} ({pct(conteo[e.value])} %)
                  </li>
                ))}
              </ul>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-base">Alumnos asignados</h3>
            <form className="flex gap-2" action="/protected/nutricion">
              <Select name="estado" defaultValue={filtroEstado ?? "todos"} className="w-40" aria-label="Estado">
                {ESTADOS_ASIGNACION.map((e) => (
                  <option key={e.value} value={e.value}>
                    {e.label}
                  </option>
                ))}
                <option value="todos">Todos</option>
              </Select>
              <Input name="q" placeholder="Buscar alumno" defaultValue={params.q ?? ""} className="w-56" />
              <Button type="submit" variant="outline">
                Buscar
              </Button>
            </form>
          </div>

          {total === 0 ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center text-sm text-muted-foreground">
              Aún no hay alumnos con plan nutricional.
              <Button asChild>
                <Link href="/protected/nutricion/asignar">
                  <Plus className="h-4 w-4" />
                  Asignar alumno
                </Link>
              </Button>
            </div>
          ) : visibles.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Ninguna asignación coincide con el filtro.
            </p>
          ) : (
            <Table className="text-[13px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Alumno</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Inicio</TableHead>
                  <TableHead>Término</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibles.map((a) => {
                  const al = alumnoPorId.get(a.alumno_id);
                  return (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium text-foreground">
                        {al?.nombre ?? "—"}
                      </TableCell>
                      <TableCell>{a.plan_id ? (planPorId.get(a.plan_id) ?? "—") : "Sin plan"}</TableCell>
                      <TableCell className="whitespace-nowrap">{formatFecha(a.fecha_inicio)}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        {a.fecha_fin ? formatFecha(a.fecha_fin) : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={VARIANTE_ESTADO[a.estado]}>{labelEstadoAsignacion(a.estado)}</Badge>
                      </TableCell>
                      <TableCell className="w-px whitespace-nowrap text-right">
                        <AsignacionAcciones id={a.id} estado={a.estado} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
