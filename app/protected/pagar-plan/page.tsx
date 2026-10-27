import { iniciarPagoSuscripcion } from "@/app/protected/pagar-plan/actions";
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
import { formatFecha, formatMonto } from "@/lib/format";
import { tokenAntonio } from "@/lib/mercadopago";
import { ESTADO_SOLICITUD_LABEL } from "@/lib/pagar-plan";
import { getPerfilActual } from "@/lib/perfil";
import { createClient } from "@/lib/supabase/server";
import { hoyIso } from "@/lib/turnos";
import type { CuentaTransferencia, SolicitudPago } from "@/lib/types";

const VARIANTE = {
  pendiente: "secondary",
  confirmado: "success",
  rechazado: "destructive",
} as const;

type Uso = {
  plan_nombre: string;
  max_alumnos: number | null;
  alumnos_activos: number;
  plan_siguiente: string | null;
  cerca_del_tope: boolean;
};

export default async function SuscripcionPage({
  searchParams,
}: {
  searchParams: Promise<{ enviado?: string }>;
}) {
  const { enviado } = await searchParams;
  const perfilData = await getPerfilActual();
  if (!perfilData) return null;

  if (perfilData.perfil.rol !== "dueño") {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          La suscripción la gestiona la dueña del gimnasio.
        </CardContent>
      </Card>
    );
  }

  const gimnasioId = perfilData.perfil.gimnasio_id;
  const supabase = await createClient();
  const [{ data: gimnasio }, { data: uso }, { data: cuenta }, { data: solicitudes }] =
    await Promise.all([
      supabase
        .from("gimnasios")
        .select("plan_sistema_id, suscripcion_hasta")
        .eq("id", gimnasioId)
        .maybeSingle(),
      supabase.from("v_uso_plan_sistema").select("*").eq("gimnasio_id", gimnasioId).maybeSingle(),
      supabase.from("cuentas_transferencia").select("*").is("gimnasio_id", null).maybeSingle(),
      supabase
        .from("solicitudes_pago")
        .select("*")
        .eq("flujo", "suscripcion")
        .eq("gimnasio_id", gimnasioId)
        .order("created_at", { ascending: false }),
    ]);

  let planId: string | null = gimnasio?.plan_sistema_id ?? null;
  if (!planId) {
    const { data } = await supabase.rpc("plan_sistema_requerido", { p_gimnasio_id: gimnasioId });
    planId = (data as string | null) ?? null;
  }
  const { data: plan } = planId
    ? await supabase.from("planes_sistema").select("nombre, precio_mensual").eq("id", planId).maybeSingle()
    : { data: null };

  const uso_ = uso as Uso | null;
  const historial = (solicitudes ?? []) as SolicitudPago[];
  const vence = gimnasio?.suscripcion_hasta as string | null | undefined;
  const vencida = !!vence && vence < hoyIso();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="mb-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Panel del dueño
        </div>
        <h2 className="text-2xl">Suscripción al sistema</h2>
      </div>

      {enviado && (
        <Card>
          <CardContent className="py-4 text-sm">
            Recibimos tu comprobante. Queda pendiente hasta que sea validado.
          </CardContent>
        </Card>
      )}

      {uso_?.cerca_del_tope && (
        <Card className="border-primary">
          <CardContent className="py-4 text-sm">
            Tienes {uso_.alumnos_activos} de {uso_.max_alumnos} alumnos activos del plan{" "}
            {uso_.plan_nombre}.{" "}
            {uso_.plan_siguiente
              ? `Si superas el tope, tu plan pasará automáticamente a ${uso_.plan_siguiente}; el nuevo precio rige desde tu próximo pago.`
              : "Este es el plan más alto."}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-4 py-5">
          <div>
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Plan del sistema</div>
            <div className="text-lg font-semibold">{plan?.nombre ?? "Sin plan"}</div>
            {plan && (
              <div className="text-sm text-muted-foreground">
                {formatMonto(Number(plan.precio_mensual))} por mes
              </div>
            )}
            {uso_ && (
              <div className="text-xs text-muted-foreground">
                {uso_.alumnos_activos} alumnos activos
                {uso_.max_alumnos ? ` de ${uso_.max_alumnos}` : ""}
              </div>
            )}
          </div>
          <div className="text-right">
            <Badge variant={!vence ? "secondary" : vencida ? "destructive" : "success"}>
              {!vence ? "Sin suscripción" : vencida ? "Vencida" : "Al día"}
            </Badge>
            {vence && (
              <div className="mt-1 text-xs text-muted-foreground">Vence el {formatFecha(vence)}</div>
            )}
          </div>
        </CardContent>
      </Card>

      {plan ? (
        <PagarPlanForm
          accion={iniciarPagoSuscripcion}
          precioMensual={Number(plan.precio_mensual)}
          mercadoPagoDisponible={!!tokenAntonio()}
          cuenta={(cuenta as CuentaTransferencia | null) ?? null}
          hoy={hoyIso()}
        />
      ) : (
        <Card>
          <CardContent className="py-6 text-sm text-muted-foreground">
            No hay un plan del sistema disponible. Contacta al proveedor.
          </CardContent>
        </Card>
      )}

      <div>
        <h3 className="mb-3 text-lg">Historial de pagos</h3>
        {historial.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aún no hay pagos de suscripción.</p>
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
