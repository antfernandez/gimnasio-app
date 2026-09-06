import { Plus } from "lucide-react";
import Link from "next/link";

import { ToggleActivoButton } from "@/components/alumnos/toggle-activo-button";
import { ExportMenu } from "@/components/export/export-menu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatFecha } from "@/lib/format";
import { getPerfilActual } from "@/lib/perfil";
import { createClient } from "@/lib/supabase/server";
import type { Alumno } from "@/lib/types";
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
  }>;
}) {
  const params = await searchParams;
  const q = (params.q ?? "").trim();
  const estado =
    params.estado === "inactivos" || params.estado === "todos"
      ? params.estado
      : "activos";

  const perfilData = await getPerfilActual();
  if (!perfilData) return null; // el layout ya redirige a /auth/login

  const supabase = await createClient();
  let query = supabase
    .from("alumnos")
    .select("*, plan:planes(nombre)")
    .eq("gimnasio_id", perfilData.perfil.gimnasio_id)
    .order("apellidos", { ascending: true });

  if (estado === "activos") query = query.eq("activo", true);
  if (estado === "inactivos") query = query.eq("activo", false);
  if (q) {
    const qSafe = q.replace(/[,%]/g, "");
    query = query.or(`nombres.ilike.%${qSafe}%,apellidos.ilike.%${qSafe}%`);
  }

  const { data: alumnos } = await query;
  const lista = (alumnos ?? []) as AlumnoConPlan[];

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
            </div>
          </div>

          {lista.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              {q
                ? "No hay alumnos que coincidan con tu búsqueda."
                : "Aún no tienes alumnos registrados."}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Alumno</TableHead>
                  <TableHead>Contacto</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Inicio</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lista.map((alumno) => (
                  <TableRow key={alumno.id}>
                    <TableCell className="font-medium text-foreground">
                      <Link
                        href={`/protected/alumnos/${alumno.id}`}
                        className="hover:text-primary hover:underline"
                      >
                        {alumno.nombres} {alumno.apellidos}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col text-xs">
                        {alumno.email && <span>{alumno.email}</span>}
                        {alumno.telefono && <span>{alumno.telefono}</span>}
                        {!alumno.email && !alumno.telefono && <span>—</span>}
                      </div>
                    </TableCell>
                    <TableCell>{alumno.plan?.nombre ?? "—"}</TableCell>
                    <TableCell>{formatFecha(alumno.fecha_inicio)}</TableCell>
                    <TableCell>
                      <Badge variant={alumno.activo ? "success" : "secondary"}>
                        {alumno.activo ? "Activo" : "De baja"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/protected/alumnos/${alumno.id}`}>
                            Editar
                          </Link>
                        </Button>
                        <ToggleActivoButton
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
        </CardContent>
      </Card>
    </div>
  );
}
