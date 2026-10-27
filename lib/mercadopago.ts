import { createHmac, timingSafeEqual } from "node:crypto";

const API = "https://api.mercadopago.com";

/** Flujo A: el alumno paga a la cuenta de Valinor. El token vive solo en el servidor. */
export function tokenValinor(): string | null {
  return process.env.MP_ACCESS_TOKEN_VALINOR || null;
}

export async function crearPreferencia(opts: {
  token: string;
  solicitudId: string;
  titulo: string;
  monto: number;
  siteUrl: string;
}): Promise<{ id: string; initPoint: string }> {
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
        success: `${opts.siteUrl}/portal/pagar-plan/resultado`,
        pending: `${opts.siteUrl}/portal/pagar-plan/resultado`,
        failure: `${opts.siteUrl}/portal/pagar-plan/resultado`,
      },
      auto_return: "approved",
      notification_url: `${opts.siteUrl}/api/mercadopago/webhook`,
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
