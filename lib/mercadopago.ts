import { createHmac, timingSafeEqual } from "node:crypto";

const API = "https://api.mercadopago.com";

/** Flujo A: el alumno paga a la cuenta de Valinor. El token vive solo en el servidor. */
export function tokenValinor(): string | null {
  return process.env.MP_ACCESS_TOKEN_VALINOR || null;
}

/** Flujo B: la dueña paga la suscripción a la cuenta de Antonio Fernandez. */
export function tokenAntonio(): string | null {
  return process.env.MP_ACCESS_TOKEN_ANTONIO || null;
}

export type FlujoMp = "alumno" | "suscripcion";

/** Cada cuenta de Mercado Pago tiene su propia aplicación y, por tanto, su propio
 * secreto de webhook. */
export function credencialesMp(flujo: FlujoMp): { token: string | null; secret: string | null } {
  return flujo === "suscripcion"
    ? { token: tokenAntonio(), secret: process.env.MP_WEBHOOK_SECRET_ANTONIO || null }
    : { token: tokenValinor(), secret: process.env.MP_WEBHOOK_SECRET || null };
}

export async function crearPreferencia(opts: {
  token: string;
  solicitudId: string;
  titulo: string;
  monto: number;
  siteUrl: string;
  flujo?: FlujoMp;
}): Promise<{ id: string; initPoint: string }> {
  const flujo = opts.flujo ?? "alumno";
  const retorno =
    flujo === "suscripcion" ? "/protected/pagar-plan/resultado" : "/portal/pagar-plan/resultado";
  const res = await fetch(`${API}/checkout/preferences`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${opts.token}`,
      "Content-Type": "application/json",
      "X-Idempotency-Key": opts.solicitudId,
    },
    body: JSON.stringify({
      items: [
        {
          title: opts.titulo,
          quantity: 1,
          unit_price: opts.monto,
          currency_id: "CLP",
        },
      ],
      external_reference: opts.solicitudId,
      back_urls: {
        success: `${opts.siteUrl}${retorno}`,
        pending: `${opts.siteUrl}${retorno}`,
        failure: `${opts.siteUrl}${retorno}`,
      },
      auto_return: "approved",
      notification_url: `${opts.siteUrl}/api/mercadopago/webhook?flujo=${flujo}`,
    }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Mercado Pago preferencia: ${res.status}`);
  const json = (await res.json()) as { id: string; init_point: string };
  return { id: json.id, initPoint: json.init_point };
}

export type PagoMp = {
  id: number;
  status: string;
  transaction_amount: number;
  external_reference: string | null;
};

export async function obtenerPago(token: string, paymentId: string): Promise<PagoMp | null> {
  const res = await fetch(`${API}/v1/payments/${encodeURIComponent(paymentId)}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) return null;
  return (await res.json()) as PagoMp;
}

/** Valida `x-signature` según la guía de webhooks de Mercado Pago:
 * HMAC-SHA256 de `id:<data.id>;request-id:<x-request-id>;ts:<ts>;` con el secreto. */
export function firmaValida(opts: {
  secret: string;
  xSignature: string | null;
  xRequestId: string | null;
  dataId: string | null;
}): boolean {
  if (!opts.xSignature || !opts.dataId) return false;
  const partes = Object.fromEntries(
    opts.xSignature.split(",").map((p) => {
      const [k, ...v] = p.trim().split("=");
      return [k, v.join("=")];
    }),
  );
  const ts = partes["ts"];
  const v1 = partes["v1"];
  if (!ts || !v1) return false;

  const id = /^[a-z0-9]+$/i.test(opts.dataId) ? opts.dataId.toLowerCase() : opts.dataId;
  const manifest = `id:${id};request-id:${opts.xRequestId ?? ""};ts:${ts};`;
  const esperada = createHmac("sha256", opts.secret).update(manifest).digest("hex");

  const a = Buffer.from(esperada);
  const b = Buffer.from(v1);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Mercado Pago simulado (spec 54): sin credenciales reales, la opción se habilita con un
 * checkout falso y datos ficticios. Solo fuera de producción, o con `MP_MODO_PRUEBA=1`
 * explícito; en producción sin esa variable la opción sigue desactivada. */
export function mpModoPrueba(): boolean {
  if (tokenAntonio()) return false;
  return process.env.NODE_ENV !== "production" || process.env.MP_MODO_PRUEBA === "1";
}
