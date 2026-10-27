import { EstadoPagoBadge } from "@/components/pagos/estado-pago-badge";
import { PagarPlanForm } from "@/components/portal/pagar-plan-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getAlumnoActual } from "@/lib/alumno-portal";
import { formatFecha, formatMonto } from "@/lib/format";
import { ESTADO_SOLICITUD_LABEL } from "@/lib/pagar-plan";
import { tokenValinor } from "@/lib/mercadopago";
import { createClient } from "@/lib/supabase/server";
import { hoyIso } from "@/lib/turnos";
import type {
  CuentaTransferencia,
  EstadoPago,
  Plan,
  SolicitudPago,
} from "@/lib/types";

const VARIANTE = {
  pendiente: "secondary",
  confirmado: "success",
  rechazado: "destructive",
} as const;

export default async function PagarPlanPage({
  searchParams,
}: {
  searchParams: Promise<{ enviado?: string }>;
}) {
  const { enviado } = await searchParams;
  const alumno = await getAlumnoActual();
  if (!alumno) return null; // el layout ya redirige a /auth/login

  const supabase = await createClient();
  const [{ data: plan }, { data: estado }, { data: gimnasio }, { data: cuenta }, { data: solicitudes }] =
    await Promise.all([
      alumno.plan_id
        ? supabase.from("planes").select("*").eq("id", alumno.plan_id).maybeSingle()
        : Promise.resolve({ data: null }),
      supabase
        .from("v_estado_cobranza_alumnos")
        .select("estado_pago, vencimiento_actual")
        .eq("alumno_id", alumno.id)
        .maybeSingle(),
      supabase
        .from("gimnasios")
        .select("mercado_pago_habilitado")
        .eq("id", alumno.gimnasio_id)
        .maybeSingle(),
      supabase
        .from("cuentas_transferencia")
        .select("*")
        .eq("gimnasio_id", alumno.gimnasio_id)
        .maybeSingle(),
      supabase
        .from("solicitudes_pago")
        .select("*")
        .eq("alumno_id", alumno.id)
        .order("created_at", { ascending: false }),
    ]);

  const planActual = plan as Plan | null;
  const estadoPago = estado as { estado_pago: EstadoPago; vencimiento_actual: string | null } | null;
  const historial = (solicitudes ?? []) as SolicitudPago[];
  const puedePagar =
    alumno.estado_aprobacion === "aprobado" && !!planActual?.precio;
  const mpDisponible = !!gimnasio?.mercado_pago_habilitado && !!tokenValinor();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="mb-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Portal del alumno
        </div>
        <h2 className="text-2xl">Pagar plan</h2>
      </div>

      {enviado && (
        <Card>
          <CardContent className="py-4 text-sm">
            Recibimos tu comprobante. Tu pago queda pendiente hasta que tu gimnasio lo valide.
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-4 py-5">
          <div>
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Plan contratado</div>
            <div className="text-lg font-semibold">{planActual?.nombre ?? "Sin plan asignado"}</div>
            {planActual?.precio ? (
              <div className="text-sm text-muted-foreground">{formatMonto(Number(planActual.precio))} por mes</div>
            ) : null}
          </div>
          <div className="text-right">
            {estadoPago && <EstadoPagoBadge estado={estadoPago.estado_pago} />}
            {estadoPago?.vencimiento_actual && (
              <div className="mt-1 text-xs text-muted-foreground">
                Vence el {formatFecha(estadoPago.vencimiento_actual)}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {puedePagar ? (
        <PagarPlanForm
          precioMensual={Number(planActual!.precio)}
          mercadoPagoDisponible={mpDisponible}
          cuenta={(cuenta as CuentaTransferencia | null) ?? null}
          hoy={hoyIso()}
        />
      ) : (
        <Card>
          <CardContent className="py-6 text-sm text-muted-foreground">
            Todavía no puedes pagar desde acá: necesitas un registro aprobado y un plan con precio.
            Contacta a tu gimnasio.
          </CardContent>
        </Card>
      )}

      <div>
        <h3 className="mb-3 text-lg">Historial de pagos</h3>
        {historial.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aún no hay solicitudes de pago.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Meses</TableHead>
                <TableHead>Monto</TableHead>
                <TableHead>Método</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {historial.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>{formatFecha(s.created_at.slice(0, 10))}</TableCell>
                  <TableCell>{s.meses}</TableCell>
                  <TableCell>{formatMonto(Number(s.monto))}</TableCell>
                  <TableCell>{s.metodo === "mercado_pago" ? "Mercado Pago" : "Transferencia"}</TableCell>
                  <TableCell>
                    <Badge variant={VARIANTE[s.estado]}>{ESTADO_SOLICITUD_LABEL[s.estado]}</Badge>
                    {s.estado === "rechazado" && s.motivo_rechazo && (
                      <div className="mt-1 text-xs text-muted-foreground">{s.motivo_rechazo}</div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
