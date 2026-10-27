"use client";

import { Check, Copy } from "lucide-react";
import { useActionState, useState } from "react";

import type { PagarPlanState } from "@/app/portal/pagar-plan/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatMonto } from "@/lib/format";
import { MESES_PAGO } from "@/lib/pagar-plan";
import { cn } from "@/lib/utils";
import type { CuentaTransferencia } from "@/lib/types";

const initialState: PagarPlanState = {};

type Accion = (prev: PagarPlanState, formData: FormData) => Promise<PagarPlanState>;

export function PagarPlanForm({
  accion,
  precioMensual,
  mercadoPagoDisponible,
  cuenta,
  hoy,
}: {
  accion: Accion;
  precioMensual: number;
  mercadoPagoDisponible: boolean;
  cuenta: CuentaTransferencia | null;
  hoy: string;
}) {
  const [state, action, pending] = useActionState(accion, initialState);
  const [metodo, setMetodo] = useState<"mercado_pago" | "transferencia">(
    mercadoPagoDisponible ? "mercado_pago" : "transferencia",
  );
  const [meses, setMeses] = useState(1);
  const [copiado, setCopiado] = useState(false);

  const datosBancarios = cuenta
    ? [
        ["Banco", cuenta.banco],
        ["Tipo de cuenta", cuenta.tipo_cuenta],
        ["N° de cuenta", cuenta.numero_cuenta],
        ["Titular", cuenta.titular],
        ["RUT", cuenta.rut_titular],
        ...(cuenta.email_contacto ? [["Correo", cuenta.email_contacto]] : []),
      ]
    : [];

  async function copiar() {
    await navigator.clipboard.writeText(datosBancarios.map(([k, v]) => `${k}: ${v}`).join("\n"));
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  const tarjeta = (valor: typeof metodo, titulo: string, detalle: string, deshabilitada = false) => (
    <button
      type="button"
      disabled={deshabilitada}
      onClick={() => setMetodo(valor)}
      className={cn(
        "rounded-2xl border p-4 text-left transition-all disabled:cursor-not-allowed disabled:opacity-50",
        metodo === valor ? "border-primary bg-primary/10" : "border-border hover:border-primary/50",
      )}
    >
      <div className="text-sm font-semibold">{titulo}</div>
      <div className="mt-1 text-xs text-muted-foreground">{detalle}</div>
    </button>
  );

  return (
    <form action={action} className="flex flex-col gap-6">
      <input type="hidden" name="metodo" value={metodo} />

      <div className="grid gap-2 sm:max-w-xs">
        <Label htmlFor="meses">Cantidad de meses</Label>
        <Select
          id="meses"
          name="meses"
          value={meses}
          onChange={(e) => setMeses(Number(e.target.value))}
        >
          {MESES_PAGO.map((m) => (
            <option key={m} value={m}>
              {m} {m === 1 ? "mes" : "meses"}
            </option>
          ))}
        </Select>
        <p className="text-sm">
          Total a pagar: <strong>{formatMonto(precioMensual * meses)}</strong>
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {tarjeta(
          "mercado_pago",
          "Mercado Pago",
          mercadoPagoDisponible
            ? "Pago inmediato, se confirma solo."
            : "No disponible por ahora.",
          !mercadoPagoDisponible,
        )}
        {tarjeta("transferencia", "Transferencia", "Sube tu comprobante; se valida manualmente.")}
      </div>

      {metodo === "transferencia" && (
        <Card>
          <CardContent className="flex flex-col gap-5 py-5">
            {cuenta ? (
              <div>
                <dl className="grid gap-1 text-sm sm:grid-cols-2">
                  {datosBancarios.map(([k, v]) => (
                    <div key={k}>
                      <dt className="inline text-muted-foreground">{k}: </dt>
                      <dd className="inline font-medium">{v}</dd>
                    </div>
                  ))}
                </dl>
                <Button type="button" variant="outline" size="sm" className="mt-3" onClick={copiar}>
                  {copiado ? <Check /> : <Copy />}
                  {copiado ? "Copiado" : "Copiar datos"}
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Aún no hay datos bancarios configurados. Contacta a quien cobra para pagar.
              </p>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="fecha_transferencia">Fecha de la transferencia</Label>
                <Input id="fecha_transferencia" name="fecha_transferencia" type="date" max={hoy} required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="comprobante">Comprobante (JPG, PNG, WebP o PDF, máx. 5 MB)</Label>
                <Input
                  id="comprobante"
                  name="comprobante"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  required
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="nota">Nota (opcional)</Label>
              <Textarea id="nota" name="nota" rows={2} />
            </div>
          </CardContent>
        </Card>
      )}

      {state.error && <p className="text-sm text-destructive">{state.error}</p>}

      <div>
        <Button type="submit" disabled={pending || (metodo === "transferencia" && !cuenta)}>
          {pending
            ? "Procesando…"
            : metodo === "mercado_pago"
              ? "Pagar con Mercado Pago"
              : "Enviar comprobante"}
        </Button>
      </div>
    </form>
  );
}
