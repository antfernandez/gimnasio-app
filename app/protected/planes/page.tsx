import { Plus } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { PlanAcciones } from "@/components/planes/plan-acciones";
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
import { formatFecha, formatMonto } from "@/lib/format";
import { cortarPagina, leerPagina } from "@/lib/paginacion";
import { ESTADO_PLAN_LABEL, estadoPlan } from "@/lib/planes";
import { getPerfilActual } from "@/lib/perfil";
import { createClient } from "@/lib/supabase/server";
import type { Plan } from "@/lib/types";

const NIVEL_LABEL: Record<string, string> = {
  basico: "Básico",
  intermedio: "Intermedio",
  avanzado: "Avanzado",
};

export default async function PlanesPage({
  searchParams,
}: {
  searchParams: Promise<{ creado?: string; actualizado?: string; q?: string; estado?: string; pagina?: string }>;
}) {
  const params = await searchParams;

  const perfilData = await getPerfilActual();
  if (!perfilData) return null; // el layout ya redirige a /auth/login

  const supabase = await createClient();
  const [{ data: planes }, { data: alumnos }] = await Promise.all([
    supabase
      .from("planes")
      .select("*")
      .eq("gimnasio_id", perfilData.perfil.gimnasio_id)
      .order("dias_por_semana", { ascending: true }),
    supabase
      .from("alumnos")
      .select("plan_id, activo")
      .eq("gimnasio_id", perfilData.perfil.gimnasio_id),
  ]);

  const hoy = new Date().toISOString().slice(0, 10);
  const q = (params.q ?? "").trim();
  const estado = params.estado ?? "";
  const pagina = leerPagina(params.pagina);
  const filtrados = ((planes ?? []) as Plan[]).filter(
    (p) =>
      (!q || p.nombre.toLowerCase().includes(q.toLowerCase())) &&
      (!estado || estadoPlan(p, hoy) === estado),
  );
  const lista = cortarPagina(filtrados, pagina);

  // Columna "Alumnos" cuenta solo activos; la regla de baja usa el total.
  const alumnosPorPlan = new Map<string, number>();
  const asignadosPorPlan = new Map<string, number>();
  for (const { plan_id, activo } of (alumnos ?? []) as {
    plan_id: string | null;
    activo: boolean;
  }[]) {
    if (!plan_id) continue;
    asignadosPorPlan.set(plan_id, (asignadosPorPlan.get(plan_id) ?? 0) + 1);
    if (activo) alumnosPorPlan.set(plan_id, (alumnosPorPlan.get(plan_id) ?? 0) + 1);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="mb-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Panel del dueño
          </div>
          <h2 className="text-2xl">Planes</h2>
        </div>
        <Button asChild size="lg">
          <Link href="/protected/planes/nuevo">
            <Plus className="h-4 w-4" />
            Nuevo plan
          </Link>
        </Button>
      </div>

      {params.creado === "1" && (
        <div className="rounded-[9px] border border-success/35 bg-success/10 px-4 py-3 text-sm text-success">
          Plan creado correctamente.
        </div>
      )}
      {params.actualizado === "1" && (
        <div className="rounded-[9px] border border-success/35 bg-success/10 px-4 py-3 text-sm text-success">
          Plan actualizado correctamente.
        </div>
      )}

      <Card>
        <CardContent className="pt-6">
          {/* Sin `pagina` en el form: cambiar un filtro reinicia la lista. */}
          <form className="mb-5 flex flex-wrap items-center gap-3" action="/protected/planes">
            <Input
              type="search"
              name="q"
              placeholder="Buscar por nombre…"
              defaultValue={q}
              className="min-w-[220px] max-w-xs flex-1"
            />
            <Select name="estado" defaultValue={estado} aria-label="Filtrar por estado" className="w-auto">
              <option value="">Todos</option>
              <option value="vigente">Vigente</option>
              <option value="proximo">Próximo</option>
              <option value="vencido">Vencido</option>
            </Select>
            <Button type="submit" variant="outline">
              Filtrar
            </Button>
            <BotonLimpiar href="/protected/planes" activo={Boolean(q || estado)} />
          </form>

          {filtrados.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              {q || estado
                ? "No hay planes que coincidan con los filtros."
                : "Aún no tienes planes creados. Los tres niveles habituales son Básico, Intermedio y Avanzado."}
            </p>
          ) : (
            <Table className="text-[13px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Nivel</TableHead>
                  <TableHead>Días/semana</TableHead>
                  <TableHead>Precio</TableHead>
                  <TableHead>Vigencia</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Alumnos</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lista.map((plan) => {
                  const estado = estadoPlan(plan, hoy);
                  return (
                    <TableRow key={plan.id}>
                      <TableCell className="font-medium text-foreground">
                        <Link
                          href={`/protected/planes/${plan.id}`}
                          className="hover:text-primary hover:underline"
                        >
                          {plan.nombre}
                        </Link>
                      </TableCell>
                      <TableCell>{NIVEL_LABEL[plan.nivel]}</TableCell>
                      <TableCell>{plan.dias_por_semana}</TableCell>
                      <TableCell>{plan.precio ? formatMonto(plan.precio) : "—"}</TableCell>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                        {formatFecha(plan.fecha_vigencia_desde)} –{" "}
                        {plan.fecha_vigencia_hasta
                          ? formatFecha(plan.fecha_vigencia_hasta)
                          : "Sin término"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            estado === "vigente"
                              ? "success"
                              : estado === "proximo"
                                ? "outline"
                                : "secondary"
                          }
                        >
                          {ESTADO_PLAN_LABEL[estado]}
                        </Badge>
                      </TableCell>
                      <TableCell>{alumnosPorPlan.get(plan.id) ?? 0}</TableCell>
                      <TableCell className="w-px whitespace-nowrap text-right">
                        <PlanAcciones
                          id={plan.id}
                          nombre={plan.nombre}
                          estado={estado}
                          alumnosAsignados={asignadosPorPlan.get(plan.id) ?? 0}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}

          <Paginador
            pathname="/protected/planes"
            query={{ q, estado }}
            pagina={pagina}
            total={filtrados.length}
          />
        </CardContent>
      </Card>
    </div>
  );
}
