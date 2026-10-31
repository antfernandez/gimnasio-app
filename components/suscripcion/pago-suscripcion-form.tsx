"use client";

import { Banknote, Check, Copy, CreditCard, Lock, ShieldCheck, Upload } from "lucide-react";
import { useActionState, useState } from "react";

import type { PagarPlanState } from "@/app/portal/pagar-plan/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatFecha, formatMonto } from "@/lib/format";
import { MESES_PAGO, rangoPeriodo } from "@/lib/pagar-plan";
import { calcularMontoSuscripcion } from "@/lib/planes-sistema";
import { cn } from "@/lib/utils";
import type { CuentaTransferencia } from "@/lib/types";

const initialState: PagarPlanState = {};

type Accion = (prev: PagarPlanState, formData: FormData) => Promise<PagarPlanState>;
type Metodo = "transferencia" | "mercado_pago";

export function PagoSuscripcionForm({
  accion,
  precioNeto,
  ivaPct,
  mercadoPagoDisponible,
  cuenta,
  hoy,
  conIva = true,
  inicioPeriodo,
  mercadoPagoPrueba = false,
  sinDescripcion = false,
}: {
  accion: Accion;
  precioNeto: number;
  /** Solo flujo con IVA; por defecto 19. */
  ivaPct?: number;
  mercadoPagoDisponible: boolean;
  cuenta: CuentaTransferencia | null;
  hoy: string;
  /** false = el precio ya es final (pago de un alumno a su gimnasio, sin IVA adicional). */
  conIva?: boolean;
  /** Primer día que cubre el próximo pago (spec 54): con él el selector pide el período a pagar. */
  inicioPeriodo?: string;
  /** Mercado Pago simulado (sin credenciales, solo entornos de prueba). */
  mercadoPagoPrueba?: boolean;
  /** Oculta el texto explicativo sobre los métodos de pago. */
  sinDescripcion?: boolean;
}) {
  const [state, action, pending] = useActionState(accion, initialState);
  const [metodo, setMetodo] = useState<Metodo>("transferencia");
  const [meses, setMeses] = useState(1);
  const [copiado, setCopiado] = useState(false);

  const totalPara = (m: number) => (conIva ? calcularMontoSuscripcion(precioNeto, m, ivaPct) : precioNeto * m);
  const total = totalPara(meses);

  const filas = cuenta
    ? [
        ["Nombre", cuenta.titular],
        ["RUT", cuenta.rut_titular],
        ["Banco", cuenta.banco],
        ["Tipo", cuenta.tipo_cuenta],
        ["Cuenta", cuenta.numero_cuenta],
        ...(cuenta.email_contacto ? [["Correo", cuenta.email_contacto]] : []),
      ]
    : [];

  async function copiar() {
    await navigator.clipboard.writeText(filas.map(([k, v]) => `${k}: ${v}`).join("\n"));
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  const selectorMeses = (
    <div className="grid gap-2">
      <Label htmlFor="meses">{inicioPeriodo ? "Período que estás pagando" : "¿Cuántos meses pagas?"}</Label>
      <Select
        id="meses"
        name="meses"
        value={meses}
        onChange={(e) => setMeses(Number(e.target.value))}
      >
        {MESES_PAGO.map((m) => {
          const r = inicioPeriodo ? rangoPeriodo(inicioPeriodo, m) : null;
          return (
            <option key={m} value={m}>
              {r ? `${formatFecha(r.desde)} – ${formatFecha(r.hasta)} · ` : ""}
              {m} {m === 1 ? "mes" : "meses"} — {formatMonto(totalPara(m))}
            </option>
          );
        })}
      </Select>
    </div>
  );

  const pestana = (valor: Metodo, titulo: string, icono: React.ReactNode, off = false) => (
    <button
      type="button"
      disabled={off}
      onClick={() => setMetodo(valor)}
      className={cn(
        "flex items-center justify-center gap-2 rounded-[9px] px-4 py-3 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        metodo === valor
          ? "bg-primary text-primary-foreground"
          : "text-primary hover:bg-primary/10",
      )}
    >
      {icono}
      {titulo}
    </button>
  );

  return (
    <form action={action} className="flex flex-col gap-5">
      <input type="hidden" name="metodo" value={metodo} />

      <div className="grid grid-cols-2 gap-2">
        {pestana("transferencia", "Transferencia", <Banknote className="size-4" />)}
        {pestana(
          "mercado_pago",
          mercadoPagoPrueba
            ? "Mercado Pago (modo de prueba)"
            : mercadoPagoDisponible
              ? "Mercado Pago"
              : "Mercado Pago (no disponible)",
          <CreditCard className="size-4" />,
          !mercadoPagoDisponible && !mercadoPagoPrueba,
        )}
      </div>

      {!sinDescripcion && (
        <p className="text-sm font-medium">
          Pago automático e inmediato con Mercado Pago, o por transferencia bancaria subiendo
          comprobante.
        </p>
      )}

      {metodo === "transferencia" ? (
        <div className="grid gap-5 lg:grid-cols-2">
          <Card>
            <CardContent className="flex flex-col gap-4 py-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-semibold">
                  <Banknote className="size-4" /> Transferencia
                </div>
                {cuenta && (
                  <Button type="button" variant="outline" size="sm" onClick={copiar}>
                    {copiado ? <Check /> : <Copy />}
                    {copiado ? "Copiado" : "Copiar"}
                  </Button>
                )}
              </div>
              {cuenta ? (
                <dl className="text-sm">
                  {filas.map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-3 border-b py-2 last:border-0">
                      <dt className="text-muted-foreground">{k}</dt>
                      <dd className="text-right font-semibold">{v}</dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Aún no hay datos bancarios configurados. Contacta al proveedor.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex flex-col gap-4 py-5">
              <div className="flex items-center gap-2 font-semibold">
                <Upload className="size-4" /> Subir comprobante
              </div>
              {selectorMeses}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="fecha_transferencia">Fecha transferencia</Label>
                  <Input
                    id="fecha_transferencia"
                    name="fecha_transferencia"
                    type="date"
                    max={hoy}
                    defaultValue={hoy}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="comprobante">
                    Comprobante <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="comprobante"
                    name="comprobante"
                    type="file"
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    required
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">JPG, PNG, WebP o PDF. Máx 5MB.</p>
              <div className="grid gap-2">
                <Label htmlFor="nota">Nota (opcional)</Label>
                <Textarea id="nota" name="nota" rows={1} className="min-h-[44px]" placeholder="Ej: Transferencia a nombre de..." />
              </div>
              <Button type="submit" disabled={pending || !cuenta}>
                {pending ? "Procesando…" : "Enviar comprobante"}
              </Button>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="mx-auto flex w-full max-w-lg flex-col gap-5 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <CreditCard className="size-6" />
          </div>
          <p className="text-sm">
            Paga con tarjeta de débito, crédito o saldo de Mercado Pago. El pago se confirma al
            instante.{mercadoPagoPrueba && " Modo de prueba: no se realiza ningún cobro real."}
          </p>
          <div className="text-left">{selectorMeses}</div>
          <div className="rounded-[9px] bg-secondary py-5">
            <div className="text-sm text-muted-foreground">Total a pagar:</div>
            <div className="text-3xl font-bold text-primary">{formatMonto(total)}</div>
            {conIva && <div className="text-xs text-muted-foreground">IVA incluido</div>}
          </div>
          <Button type="submit" disabled={pending}>
            <Lock />
            {pending ? "Procesando…" : "Pagar con Mercado Pago"}
          </Button>
          <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck className="size-3.5" />
            Serás redirigido a Mercado Pago para completar el pago de forma segura.
          </p>
        </div>
      )}

      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
    </form>
  );
}
