import { AsignacionAcciones } from "@/components/nutricion/asignacion-acciones";
import { AsignarPanel } from "@/components/nutricion/asignar-panel";
import { Badge } from "@/components/ui/badge";
import { BotonLimpiar } from "@/components/ui/boton-limpiar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Paginador } from "@/components/ui/paginador";
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
import { cortarPagina, leerPagina } from "@/lib/paginacion";
import { getPerfilActual } from "@/lib/perfil";
import { createClient } from "@/lib/supabase/server";

const VARIANTE_ESTADO: Record<EstadoAsignacion, "success" | "default" | "secondary" | "destructive"> = {
  activo: "success",
  pausado: "default",
  completado: "secondary",
  cancelado: "destructive",
};

/** Spec 51: grilla de alumnos con plan nutricional + botón que abre el formulario de asignación. */
export default async function AsignarAlumnoPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string; q?: string; asignado?: string; pagina?: string }>;
}) {
  const params = await searchParams;
  const perfilData = await getPerfilActual();
  if (!perfilData) return null;
  const gimnasioId = perfilData.perfil.gimnasio_id;

  // Por defecto solo Activos; "todos" desactiva el filtro.
  const verTodos = params.estado === "todos";
  const filtroEstado = verTodos
    ? undefined
    : (ESTADOS_ASIGNACION.find((e) => e.value === params.estado)?.value ?? "activo");
  const q = (params.q ?? "").trim().toLowerCase();
  const pagina = leerPagina(params.pagina);

  const supabase = await createClient();
  const [
    { data: asignaciones },
    { data: alumnosTodos },
    { data: planesTodos },
    { data: alumnosAsignables },
    { data: planesAsignables },
    { data: responsables },
  ] = await Promise.all([
    supabase
      .from("asignaciones_nutricionales")
      .select("*")
      .eq("gimnasio_id", gimnasioId)
      .order("fecha_inicio", { ascending: false }),
    supabase.from("alumnos").select("id, nombres, apellidos").eq("gimnasio_id", gimnasioId),
    supabase.from("planes_nutricionales").select("id, nombre").eq("gimnasio_id", gimnasioId),
    supabase
      .from("alumnos")
      .select("id, nombres, apellidos")
      .eq("gimnasio_id", gimnasioId)
      .eq("activo", true)
      .eq("estado_aprobacion", "aprobado")
      .eq("plan_nutricional_habilitado", true)
      .order("nombres"),
    // Un plan archivado no se puede asignar.
    supabase
      .from("planes_nutricionales")
      .select("id, nombre")
      .eq("gimnasio_id", gimnasioId)
      .neq("estado", "archivado")
      .order("nombre"),
    supabase.from("perfiles").select("id, nombre_completo").eq("gimnasio_id", gimnasioId),
  ]);

  const lista = (asignaciones ?? []) as Asignacion[];
  const alumnoPorId = new Map(
    (alumnosTodos ?? []).map((a) => [a.id as string, `${a.nombres} ${a.apellidos}`.trim()]),
  );
  const planPorId = new Map((planesTodos ?? []).map((p) => [p.id as string, p.nombre as string]));

  const nombreDe = (a: Asignacion) => alumnoPorId.get(a.alumno_id) ?? "";
  const visibles = lista
    .filter((a) => {
      if (filtroEstado && a.estado !== filtroEstado) return false;
      return !q || nombreDe(a).toLowerCase().includes(q);
    })
    .sort((a, b) => nombreDe(a).localeCompare(nombreDe(b), "es"));
  const pagVisibles = cortarPagina(visibles, pagina);

  return (
    <div className="flex flex-col gap-6">
      {params.asignado === "1" && (
        <div className="rounded-[9px] border border-success/35 bg-success/10 px-4 py-3 text-sm text-success">
          Alumno asignado correctamente.
        </div>
      )}

      <Card>
        <CardContent className="pt-6">
          <div className="mb-4">
            <AsignarPanel
              alumnos={(alumnosAsignables ?? []).map((a) => ({
                id: a.id as string,
                nombre: `${a.nombres} ${a.apellidos}`.trim(),
              }))}
              planes={(planesAsignables ?? []).map((p) => ({ id: p.id as string, nombre: p.nombre as string }))}
              responsables={(responsables ?? []).map((r) => ({
                id: r.id as string,
                nombre: r.nombre_completo as string,
              }))}
              responsableActual={perfilData.perfil.id}
              hoy={new Date().toISOString().slice(0, 10)}
            />
          </div>

          <form className="mb-5 flex flex-wrap items-center gap-3" action="/protected/nutricion/asignar">
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
              Filtrar
            </Button>
            <BotonLimpiar href="/protected/nutricion/asignar" activo={Boolean(params.q || params.estado)} />
          </form>

          {lista.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Aún no hay alumnos con plan nutricional.
            </p>
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
                {pagVisibles.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium text-foreground">{nombreDe(a) || "—"}</TableCell>
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
                ))}
              </TableBody>
            </Table>
          )}

          <Paginador
            pathname="/protected/nutricion/asignar"
            query={{ q: params.q?.trim(), estado: params.estado }}
            pagina={pagina}
            total={visibles.length}
          />
        </CardContent>
      </Card>
    </div>
  );
}
