import { cancelarSolicitudCambio, solicitarCambioPlan } from "@/app/portal/pagar-plan/cambio-plan-actions";
import { EstadoPagoBadge } from "@/components/pagos/estado-pago-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ESTADO_CAMBIO_PLAN_LABEL, ESTADO_CAMBIO_PLAN_VARIANTE } from "@/lib/cambio-plan";
import { formatFecha, formatMonto } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { EstadoPago, Plan, SolicitudCambioPlan } from "@/lib/types";

/** Spec 31, §4: planes que vende el gimnasio, con el del alumno marcado.
 * Spec 43: cada plan no asignado permite solicitar el cambio; `abierta` es la solicitud
 * pendiente o aprobada (aún sin aplicar) del alumno, si existe. */
export function PlanesGimnasioCards({
  planes,
  planActualId,
  abierta = null,
  puedeSolicitar = false,
  estadoPago = null,
  vencimiento = null,
}: {
  planes: Plan[];
  planActualId: string | null;
  abierta?: SolicitudCambioPlan | null;
  puedeSolicitar?: boolean;
  /** Estado de cobranza y vencimiento del alumno; se muestran en la tarjeta de su plan. */
  estadoPago?: EstadoPago | null;
  vencimiento?: string | null;
}) {
  if (planes.length === 0) return null;
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {planes.map((p) => {
        const actual = p.id === planActualId;
        const solicitado = abierta?.plan_nuevo_id === p.id;
        return (
          <Card key={p.id} className={cn(actual && "border-2 border-primary")}>
            <CardContent className="flex flex-col gap-1 py-5">
              <div className="flex items-center justify-between gap-2">
                <div className="text-lg font-semibold">{p.nombre}</div>
                {actual && <Badge variant="success">Tu plan</Badge>}
                {solicitado && abierta && (
                  <Badge variant={ESTADO_CAMBIO_PLAN_VARIANTE[abierta.estado]}>
                    {ESTADO_CAMBIO_PLAN_LABEL[abierta.estado]}
                  </Badge>
                )}
              </div>
              <div className="text-sm text-muted-foreground">
                {p.dias_por_semana} {p.dias_por_semana === 1 ? "clase" : "clases"} por semana
              </div>
              {p.precio != null && (
                <>
                  <div className="mt-2 text-2xl font-bold">{formatMonto(Number(p.precio))}</div>
                  <div className="text-xs text-muted-foreground">por mes</div>
                </>
              )}
              {actual && (estadoPago || vencimiento) && (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {estadoPago && <EstadoPagoBadge estado={estadoPago} />}
                  {vencimiento && (
                    <span className="text-xs text-muted-foreground">Vence el {formatFecha(vencimiento)}</span>
                  )}
                </div>
              )}
              {solicitado && abierta?.estado === "aprobada" && abierta.aplica_desde && (
                <div className="mt-2 text-xs text-muted-foreground">
                  Rige desde el {formatFecha(abierta.aplica_desde)}.
                </div>
              )}
              {solicitado && abierta?.estado === "pendiente" && (
                <form action={cancelarSolicitudCambio.bind(null, abierta.id)} className="mt-3">
                  <Button type="submit" size="sm" variant="outline">
                    Cancelar solicitud
                  </Button>
                </form>
              )}
              {!actual && !abierta && puedeSolicitar && (
                <form action={solicitarCambioPlan.bind(null, p.id)} className="mt-3 flex flex-col gap-2">
                  <Input name="nota" placeholder="Nota (opcional)" maxLength={500} aria-label="Nota" />
                  <Button type="submit" size="sm">
                    Solicitar cambio
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
