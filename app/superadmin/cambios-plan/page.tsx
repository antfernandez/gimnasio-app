import { redirect } from "next/navigation";

import {
  aprobarCambioPlanSistema,
  rechazarCambioPlanSistema,
} from "@/app/superadmin/cambios-plan/actions";
import { BotonLimpiar } from "@/components/ui/boton-limpiar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { cortarPagina, leerPagina } from "@/lib/paginacion";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSuperadminActual } from "@/lib/superadmin";

export const instant = false;

type Fila = {
  id: string;
  nota: string | null;
  created_at: string;
  gimnasios: { nombre: string } | null;
  actual: { nombre: string } | null;
  nuevo: { nombre: string } | null;
};

// Solicitudes de cambio de plan del sistema (spec 54) pendientes de aprobación.
export default async function CambiosPlanPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; pagina?: string }>;
}) {
  const params = await searchParams;
  const q = (params.q ?? "").trim();
  const pagina = leerPagina(params.pagina);
  const superadmin = await getSuperadminActual();
  if (!superadmin) redirect("/auth/login/superadmin");

  const { data } = await createAdminClient()
    .from("solicitudes_cambio_plan_sistema")
    .select(
      "id, nota, created_at, gimnasios(nombre), actual:planes_sistema!plan_actual_id(nombre), nuevo:planes_sistema!plan_nuevo_id(nombre)",
    )
    .eq("estado", "pendiente")
    .order("created_at", { ascending: true });

  const coincidentes = ((data ?? []) as unknown as Fila[]).filter(
    (s) => !q || (s.gimnasios?.nombre ?? "").toLowerCase().includes(q.toLowerCase()),
  );
  const filas = cortarPagina(coincidentes, pagina);

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-2xl">Cambios de plan por aprobar</h2>

      <form className="flex flex-wrap items-center gap-3" action="/superadmin/cambios-plan">
        <Input
          type="search"
          name="q"
          placeholder="Buscar por gimnasio…"
          defaultValue={q}
          className="min-w-[220px] max-w-xs flex-1"
        />
        <Button type="submit" variant="outline">
          Filtrar
        </Button>
        <BotonLimpiar href="/superadmin/cambios-plan" activo={Boolean(q)} />
      </form>

      {filas.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            {q ? "No hay solicitudes que coincidan." : "No hay solicitudes pendientes."}
          </CardContent>
        </Card>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Gimnasio</TableHead>
              <TableHead>Plan actual</TableHead>
              <TableHead>Plan solicitado</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Nota</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filas.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-medium text-foreground">{s.gimnasios?.nombre ?? "—"}</TableCell>
                <TableCell>{s.actual?.nombre ?? "Sin plan"}</TableCell>
                <TableCell>{s.nuevo?.nombre ?? "—"}</TableCell>
                <TableCell className="whitespace-nowrap">{formatFecha(s.created_at.slice(0, 10))}</TableCell>
                <TableCell>{s.nota || "—"}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap items-center gap-2">
                    <form action={aprobarCambioPlanSistema.bind(null, s.id)}>
                      <Button size="sm" type="submit">
                        Aprobar
                      </Button>
                    </form>
                    <form action={rechazarCambioPlanSistema.bind(null, s.id)} className="flex gap-2">
                      <Input name="motivo" placeholder="Motivo del rechazo" required className="h-8 w-44" />
                      <Button size="sm" variant="outline" type="submit">
                        Rechazar
                      </Button>
                    </form>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Paginador pathname="/superadmin/cambios-plan" query={{ q }} pagina={pagina} total={coincidentes.length} />
    </div>
  );
}
