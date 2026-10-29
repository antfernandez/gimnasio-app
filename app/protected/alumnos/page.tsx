import { Pencil, Plus, Upload } from "lucide-react";
import Link from "next/link";

import { ToggleActivoButton } from "@/components/alumnos/toggle-activo-button";
import { ExportMenu } from "@/components/export/export-menu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { IconAction } from "@/components/ui/icon-action";
import { Input } from "@/components/ui/input";
import { Paginador } from "@/components/ui/paginador";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatFecha } from "@/lib/format";
import { leerPagina, rangoPagina } from "@/lib/paginacion";
import { getPerfilActual } from "@/lib/perfil";
import { createClient } from "@/lib/supabase/server";
import type { Alumno, EstadoCobranzaAlumno } from "@/lib/types";
import { cn } from "@/lib/utils";

type AlumnoConPlan = Alumno & { plan: { nombre: string } | null };

const FILTROS = [
  { value: "activos", label: "Activos" },
  { value: "inactivos", label: "De baja" },
  { value: "todos", label: "Todos" },
] as const;

export default async function AlumnosPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    estado?: string;
    creado?: string;
    actualizado?: string;
    pagina?: string;
  }>;
}) {
  const params = await searchParams;
  const q = (params.q ?? "").trim();
  const estado =
    params.estado === "inactivos" || params.estado === "todos"
      ? params.estado
      : "activos";
  const pagina = leerPagina(params.pagina);

  const perfilData = await getPerfilActual();
  if (!perfilData) return null; // el layout ya redirige a /auth/login

  const supabase = await createClient();
  let query = supabase
    .from("alumnos")
    .select("*, plan:planes(nombre)", { count: "exact" })
    .eq("gimnasio_id", perfilData.perfil.gimnasio_id)
    .order("nombres", { ascending: true })
    .order("apellidos", { ascending: true })
    .range(...rangoPagina(pagina));

  if (estado === "activos") query = query.eq("activo", true);
  if (estado === "inactivos") query = query.eq("activo", false);
  if (q) {
    const qSafe = q.replace(/[,%]/g, "");
    query = query.or(`nombres.ilike.%${qSafe}%,apellidos.ilike.%${qSafe}%`);
  }

  const { data: alumnos, count } = await query;
  const total = count ?? 0;
  const lista = (alumnos ?? []) as AlumnoConPlan[];

  const { data: cobranza } = await supabase
    .from("v_estado_cobranza_alumnos")
    .select("alumno_id, vencimiento_actual")
    .in(
      "alumno_id",
      lista.map((a) => a.id),
    );
  const vencimientoPorAlumno = new Map(
    ((cobranza ?? []) as Pick<EstadoCobranzaAlumno, "alumno_id" | "vencimiento_actual">[]).map(
      (c) => [c.alumno_id, c.vencimiento_actual],
    ),
  );

  // Sprint 19, Parte 4: "Pendientes de aprobación" deja de ser un ítem fijo del
  // menú principal y pasa a un badge acá, visible solo cuando hay algo que
  // revisar — antes ocupaba espacio de navegación permanente sin aportar nada
  // mientras no había solicitudes (auditoría UX 2026-09-04, sección 5).
  const { count: pendientesCount } = await supabase
    .from("alumnos")
    .select("*", { count: "exact", head: true })
    .eq("gimnasio_id", perfilData.perfil.gimnasio_id)
    .eq("estado_aprobacion", "pendiente");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="mb-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Panel del dueño
          </div>
          <h2 className="text-2xl">Alumnos</h2>
        </div>
        <div className="flex items-center gap-3">
          {!!pendientesCount && (
            <Link
              href="/protected/alumnos/pendientes"
              className="flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-3.5 py-1.5 text-xs font-semibold text-secondary-foreground hover:bg-primary/20"
            >
              {pendientesCount} pendiente{pendientesCount === 1 ? "" : "s"} de aprobación
            </Link>
          )}
          <ExportMenu resource="alumnos" />
          {perfilData.perfil.rol === "dueño" && (
            <Button asChild variant="outline" size="lg">
              <Link href="/protected/alumnos/carga-masiva">
                <Upload className="h-4 w-4" />
                Carga masiva
              </Link>
            </Button>
          )}
          <Button asChild size="lg">
            <Link href="/protected/alumnos/nuevo">
              <Plus className="h-4 w-4" />
              Nuevo alumno
            </Link>
          </Button>
        </div>
      </div>

      {params.creado === "1" && (
        <div className="rounded-[9px] border border-success/35 bg-success/10 px-4 py-3 text-sm text-success">
          Alumno creado correctamente.
        </div>
      )}
      {params.actualizado === "1" && (
        <div className="rounded-[9px] border border-success/35 bg-success/10 px-4 py-3 text-sm text-success">
          Ficha actualizada correctamente.
        </div>
      )}

      <Card>
        <CardContent className="pt-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
            <form className="min-w-[220px] max-w-xs flex-1" action="/protected/alumnos">
              {estado !== "activos" && (
                <input type="hidden" name="estado" value={estado} />
              )}
              <Input
                type="search"
                name="q"
                placeholder="Buscar por nombre…"
                defaultValue={q}
              />
            </form>
            <div className="flex gap-2">
              {FILTROS.map((f) => (
                <Link
                  key={f.value}
                  href={{
                    pathname: "/protected/alumnos",
                    query: { ...(q ? { q } : {}), estado: f.value },
                  }}
                  className={cn(
                    "rounded-full border border-border px-4 py-1.5 text-xs text-muted-foreground transition-colors",
                    estado === f.value &&
                      "border-transparent bg-primary font-semibold text-primary-foreground",
                  )}
                >
                  {f.label}
                </Link>
              ))}
              {q && (
                <Link
                  href={{
                    pathname: "/protected/alumnos",
                    query: estado !== "activos" ? { estado } : {},
                  }}
                  className="rounded-full px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
                >
                  Limpiar
                </Link>
              )}
            </div>
          </div>

          {lista.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              {q
                ? "No hay alumnos que coincidan con tu búsqueda."
                : "Aún no tienes alumnos registrados."}
            </p>
          ) : (
            <Table className="text-[13px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Alumno</TableHead>
                  <TableHead>Correo</TableHead>
                  <TableHead>Teléfono</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Inicio</TableHead>
                  <TableHead>Vencimiento</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lista.map((alumno) => (
                  <TableRow key={alumno.id}>
                    <TableCell className="font-medium text-foreground">
                      {alumno.nombres} {alumno.apellidos}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-xs" title={alumno.email ?? undefined}>
                      {alumno.email || "—"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs">{alumno.telefono || "—"}</TableCell>
                    <TableCell>{alumno.plan?.nombre ?? "—"}</TableCell>
                    <TableCell className="whitespace-nowrap">{formatFecha(alumno.fecha_inicio)}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      {vencimientoPorAlumno.get(alumno.id)
                        ? formatFecha(vencimientoPorAlumno.get(alumno.id)!)
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={alumno.activo ? "success" : "secondary"}>
                        {alumno.activo ? "Activo" : "De baja"}
                      </Badge>
                    </TableCell>
                    <TableCell className="w-px whitespace-nowrap text-right">
                      <div className="flex justify-end">
                        <IconAction
                          icon={Pencil}
                          label="Editar"
                          href={`/protected/alumnos/${alumno.id}`}
                        />
                        <ToggleActivoButton
                          modoIcono
                          id={alumno.id}
                          activo={alumno.activo}
                          nombreCompleto={`${alumno.nombres} ${alumno.apellidos}`}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          <Paginador
            pathname="/protected/alumnos"
            query={{ q, estado: estado !== "activos" ? estado : undefined }}
            pagina={pagina}
            total={total}
          />
        </CardContent>
      </Card>
    </div>
  );
}
