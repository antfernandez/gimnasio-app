import { redirect } from "next/navigation";

import { AccionesGimnasio } from "@/components/superadmin/acciones-gimnasio";
import { CrearAdminForm } from "@/components/superadmin/crear-admin-form";
import { BotonFormulario } from "@/components/superadmin/boton-formulario";
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
import { cortarPagina, leerPagina } from "@/lib/paginacion";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSuperadminActual } from "@/lib/superadmin";
import { listarGimnasiosAdmin } from "@/lib/superadmin-datos";
import {
  ESTADO_SUSCRIPCION_LABEL,
  estadoSuscripcion,
  type EstadoSuscripcion,
} from "@/lib/superadmin-metricas";
import { hoyIso } from "@/lib/turnos";

export const instant = false;

const VARIANTE: Record<EstadoSuscripcion, "success" | "destructive" | "secondary" | "outline"> = {
  activo: "success",
  moroso: "destructive",
  congelado: "destructive",
  cancelado: "secondary",
  sin_plan: "outline",
};

export default async function GimnasiosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; estado?: string; plan?: string; pagina?: string }>;
}) {
  const params = await searchParams;
  const q = (params.q ?? "").trim().toLowerCase();
  const estado = params.estado ?? "";
  const planFiltro = params.plan ?? "";
  const pagina = leerPagina(params.pagina);

  const superadmin = await getSuperadminActual();
  if (!superadmin) redirect("/auth/login/superadmin");

  const hoy = hoyIso();
  const admin = createAdminClient();
  const [gimnasios, { data: planes }] = await Promise.all([
    listarGimnasiosAdmin(),
    admin.from("planes_sistema").select("id, nombre, max_alumnos").order("orden"),
  ]);
  const planPorId = new Map((planes ?? []).map((p) => [p.id as string, p]));
  const nombresPlan = [...new Set((planes ?? []).map((p) => p.nombre as string))];

  const coincidentes = gimnasios
    .map((g) => ({ g, estado: estadoSuscripcion(g, hoy) }))
    .filter(({ g, estado: e }) => {
      if (estado && e !== estado) return false;
      if (planFiltro && planPorId.get(g.plan_sistema_id ?? "")?.nombre !== planFiltro) return false;
      if (!q) return true;
      return (
        g.nombre.toLowerCase().includes(q) ||
        g.email.toLowerCase().includes(q) ||
        g.dueno_nombre.toLowerCase().includes(q)
      );
    });

  const visibles = cortarPagina(coincidentes, pagina);
  // Alumnos activos solo de las filas visibles (conteo, sin leer datos de alumnos).
  const alumnos = new Map<string, number>();
  await Promise.all(
    visibles.map(async ({ g }) => {
      const { count } = await admin
        .from("alumnos")
        .select("id", { count: "exact", head: true })
        .eq("gimnasio_id", g.id)
        .eq("activo", true);
      alumnos.set(g.id, count ?? 0);
    }),
  );

  const hayFiltros = !!(q || estado || planFiltro);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="mb-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Panel Superadmin
        </div>
        <h2 className="text-2xl">Gimnasios</h2>
      </div>

      <BotonFormulario etiqueta="+ Nuevo Gimnasio">
        <CrearAdminForm />
      </BotonFormulario>

      <form className="flex flex-wrap items-center gap-3" action="/superadmin/gimnasios">
        <Input
          type="search"
          name="q"
          placeholder="Buscar por gimnasio, dueño o correo…"
          defaultValue={params.q ?? ""}
          className="min-w-[240px] max-w-sm flex-1"
        />
        <Select name="estado" defaultValue={estado} className="w-44">
          <option value="">Todos los estados</option>
          {(Object.keys(ESTADO_SUSCRIPCION_LABEL) as EstadoSuscripcion[]).map((e) => (
            <option key={e} value={e}>
              {ESTADO_SUSCRIPCION_LABEL[e]}
            </option>
          ))}
        </Select>
        <Select name="plan" defaultValue={planFiltro} className="w-44">
          <option value="">Todos los planes</option>
          {nombresPlan.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </Select>
        <Button type="submit" variant="outline">
          Filtrar
        </Button>
        <BotonLimpiar href="/superadmin/gimnasios" activo={Boolean(hayFiltros)} />
      </form>

      {visibles.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            {hayFiltros ? "No hay gimnasios que coincidan." : "Aún no hay gimnasios creados."}
          </CardContent>
        </Card>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Gimnasio</TableHead>
              <TableHead>Dueño/a</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Alumnos</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Vence</TableHead>
              <TableHead>Alta</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibles.map(({ g, estado: e }) => {
              const plan = planPorId.get(g.plan_sistema_id ?? "");
              return (
                <TableRow key={g.id}>
                  <TableCell className="font-medium">{g.nombre}</TableCell>
                  <TableCell>
                    {g.dueno_nombre}
                    <div className="text-xs text-muted-foreground">{g.email}</div>
                  </TableCell>
                  <TableCell>{plan?.nombre ?? "—"}</TableCell>
                  <TableCell>
                    {alumnos.get(g.id) ?? 0} / {plan?.max_alumnos ?? "∞"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={VARIANTE[e]}>{ESTADO_SUSCRIPCION_LABEL[e]}</Badge>
                  </TableCell>
                  <TableCell>{g.suscripcion_hasta ? formatFecha(g.suscripcion_hasta) : "—"}</TableCell>
                  <TableCell>{formatFecha(g.created_at.slice(0, 10))}</TableCell>
                  <TableCell>
                    <AccionesGimnasio id={g.id} cancelado={e === "cancelado"} />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}

      <Paginador
        pathname="/superadmin/gimnasios"
        query={{ q: params.q, estado, plan: planFiltro }}
        pagina={pagina}
        total={coincidentes.length}
      />
    </div>
  );
}
