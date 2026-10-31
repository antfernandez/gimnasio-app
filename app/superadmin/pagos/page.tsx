import Link from "next/link";
import { redirect } from "next/navigation";

import { BotonFormulario } from "@/components/superadmin/boton-formulario";
import { PagoManualForm } from "@/components/superadmin/pago-manual-form";
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
import { formatFecha, formatMonto, formatPeriodo } from "@/lib/format";
import { cortarPagina, leerPagina } from "@/lib/paginacion";
import { precioMensualConIva } from "@/lib/planes-sistema";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSuperadminActual } from "@/lib/superadmin";
import { hoyIso } from "@/lib/turnos";

export const instant = false;

const METODO = { mercado_pago: "Mercado Pago", transferencia: "Transferencia", manual: "Manual" };
const ESTADO = { pendiente: "Pendiente", confirmado: "Validado", rechazado: "Rechazado" };

// Solo `solicitudes_pago` con `flujo = 'suscripcion'` (lo que los gimnasios pagan al
// sistema); nunca los pagos de alumnos.
export default async function PagosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; estado?: string; metodo?: string; pagina?: string }>;
}) {
  const params = await searchParams;
  const q = (params.q ?? "").trim().toLowerCase();
  const estado = params.estado ?? "";
  const metodo = params.metodo ?? "";
  const pagina = leerPagina(params.pagina);

  const superadmin = await getSuperadminActual();
  if (!superadmin) redirect("/auth/login/superadmin");

  const hoy = hoyIso();
  const admin = createAdminClient();
  const [{ data: pagos }, { data: gimnasios }, { data: planes }] = await Promise.all([
    admin
      .from("solicitudes_pago")
      .select("*, gimnasios(nombre), planes_sistema(nombre)")
      .eq("flujo", "suscripcion")
      .order("created_at", { ascending: false }),
    admin.from("gimnasios").select("id, nombre, plan_sistema_id, suscripcion_hasta").eq("estado", "activo").order("nombre"),
    admin
      .from("planes_sistema")
      .select("id, nombre, precio_mensual, iva_pct, activo, vigente_desde, vigente_hasta")
      .order("orden"),
  ]);

  const vigentes = (planes ?? []).filter(
    (p) => p.activo && p.vigente_desde <= hoy && (!p.vigente_hasta || p.vigente_hasta >= hoy),
  );

  const coincidentes = (pagos ?? []).filter(
    (s) =>
      (!estado || s.estado === estado) &&
      (!metodo || s.metodo === metodo) &&
      (!q || (s.gimnasios?.nombre ?? "").toLowerCase().includes(q)),
  );
  const filas = await Promise.all(
    cortarPagina(coincidentes, pagina).map(async (s) => {
      const { data: firmada } = s.comprobante_path
        ? await admin.storage.from("comprobantes-pago").createSignedUrl(s.comprobante_path, 600)
        : { data: null };
      return { ...s, comprobante_url: firmada?.signedUrl ?? null };
    }),
  );
  const hayFiltros = !!(q || estado || metodo);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="mb-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Panel Superadmin
        </div>
        <h2 className="text-2xl">Pagos</h2>
      </div>

      <BotonFormulario etiqueta="+ Registrar pago">
        <PagoManualForm
          gimnasios={(gimnasios ?? []).map((g) => ({
            id: g.id,
            nombre: g.nombre,
            planId: g.plan_sistema_id,
            suscripcionHasta: g.suscripcion_hasta,
          }))}
          planes={vigentes.map((p) => ({
            id: p.id,
            nombre: p.nombre,
            mensualConIva: precioMensualConIva(Number(p.precio_mensual), Number(p.iva_pct)),
          }))}
        />
      </BotonFormulario>

      <form className="flex flex-wrap items-center gap-3" action="/superadmin/pagos">
        <Input
          type="search"
          name="q"
          placeholder="Buscar por gimnasio…"
          defaultValue={params.q ?? ""}
          className="min-w-[220px] max-w-xs flex-1"
        />
        <Select name="estado" defaultValue={estado} className="w-44">
          <option value="">Todos los estados</option>
          {Object.entries(ESTADO).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </Select>
        <Select name="metodo" defaultValue={metodo} className="w-48">
          <option value="">Todos los métodos</option>
          {Object.entries(METODO).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </Select>
        <Button type="submit" variant="outline">
          Filtrar
        </Button>
        <BotonLimpiar href="/superadmin/pagos" activo={Boolean(hayFiltros)} />
      </form>

      {filas.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            {hayFiltros ? "No hay pagos que coincidan." : "Aún no hay pagos de suscripción."}
          </CardContent>
        </Card>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Gimnasio</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Período</TableHead>
              <TableHead>Meses</TableHead>
              <TableHead>Monto</TableHead>
              <TableHead>Método</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Comprobante</TableHead>
              <TableHead>Nota</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filas.map((s) => (
              <TableRow key={s.id}>
                <TableCell>{formatFecha(s.created_at.slice(0, 10))}</TableCell>
                <TableCell className="font-medium">
                  <Link href={`/superadmin/gimnasios/${s.gimnasio_id}`} className="hover:underline">
                    {s.gimnasios?.nombre ?? "—"}
                  </Link>
                </TableCell>
                <TableCell>{s.planes_sistema?.nombre ?? "—"}</TableCell>
                <TableCell>{s.periodo_desde ? formatPeriodo(s.periodo_desde, s.meses) : "—"}</TableCell>
                <TableCell>{s.meses}</TableCell>
                <TableCell>{formatMonto(Number(s.monto))}</TableCell>
                <TableCell>{METODO[s.metodo as keyof typeof METODO] ?? s.metodo}
                  {s.registro_manual && <div className="text-xs text-muted-foreground">Registro manual</div>}</TableCell>
                <TableCell>
                  <Badge
                    variant={
                      s.estado === "confirmado"
                        ? "success"
                        : s.estado === "rechazado"
                          ? "destructive"
                          : "secondary"
                    }
                  >
                    {ESTADO[s.estado as keyof typeof ESTADO] ?? s.estado}
                  </Badge>
                  {s.estado === "pendiente" && s.metodo === "transferencia" && (
                    <div className="text-xs">
                      <Link href="/superadmin/suscripciones" className="text-primary underline">
                        Validar
                      </Link>
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  {s.comprobante_url ? (
                    <a href={s.comprobante_url} target="_blank" rel="noreferrer" className="text-primary underline">
                      Ver
                    </a>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell>{s.nota ?? "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Paginador
        pathname="/superadmin/pagos"
        query={{ q: params.q, estado, metodo }}
        pagina={pagina}
        total={coincidentes.length}
      />
    </div>
  );
}
