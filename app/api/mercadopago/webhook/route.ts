import { NextResponse, type NextRequest } from "next/server";

import { firmaValida, obtenerPago, tokenValinor } from "@/lib/mercadopago";
import { createAdminClient } from "@/lib/supabase/admin";

// Webhook de Mercado Pago (flujo A). Verifica la firma, consulta el pago a la API (no
// confía en el cuerpo recibido) y confirma la solicitud. Idempotente: un reintento no
// duplica el pago (índice único en mp_payment_id + `aplicar_solicitud_pago`).
export async function POST(request: NextRequest) {
  const secret = process.env.MP_WEBHOOK_SECRET;
  const token = tokenValinor();
  if (!secret || !token) {
    return NextResponse.json({ error: "no configurado" }, { status: 503 });
  }

  const dataId = request.nextUrl.searchParams.get("data.id");
  const ok = firmaValida({
    secret,
    xSignature: request.headers.get("x-signature"),
    xRequestId: request.headers.get("x-request-id"),
    dataId,
  });
  if (!ok) return NextResponse.json({ error: "firma inválida" }, { status: 401 });

  const body = (await request.json().catch(() => null)) as { type?: string } | null;
  if (body?.type !== "payment" || !dataId) return NextResponse.json({ ok: true });

  const pago = await obtenerPago(token, dataId);
  if (!pago?.external_reference) return NextResponse.json({ ok: true });
  if (pago.status !== "approved") return NextResponse.json({ ok: true });

  const admin = createAdminClient();
  const { data: solicitud } = await admin
    .from("solicitudes_pago")
    .select("id, monto, estado, metodo, flujo")
    .eq("id", pago.external_reference)
    .maybeSingle();

  if (!solicitud || solicitud.flujo !== "alumno" || solicitud.metodo !== "mercado_pago") {
    return NextResponse.json({ ok: true });
  }
  if (solicitud.estado === "confirmado") return NextResponse.json({ ok: true });
  // El monto cobrado debe coincidir con el calculado por el servidor.
  if (Number(solicitud.monto) !== Number(pago.transaction_amount)) {
    console.error("MP: monto no coincide", solicitud.id, pago.transaction_amount);
    return NextResponse.json({ ok: true });
  }

  const { error: errPago } = await admin
    .from("solicitudes_pago")
    .update({ mp_payment_id: String(pago.id) })
    .eq("id", solicitud.id);
  if (errPago) {
    // 23505: ese pago de MP ya está asociado a otra solicitud.
    console.error("MP: no se pudo asociar el pago", errPago);
    return NextResponse.json({ ok: true });
  }

  const { error } = await admin.rpc("aplicar_solicitud_pago", { p_id: solicitud.id });
  if (error) {
    console.error("MP: no se pudo aplicar la solicitud", error);
    // 500 para que Mercado Pago reintente.
    return NextResponse.json({ error: "reintentar" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
