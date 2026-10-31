import { timingSafeEqual } from "node:crypto";
import { revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

/**
 * Invalidación manual del tag `sitio:${slug}` (Sprint 16) para recuperarse de un
 * resultado cacheado incorrecto (ej. un cold-start fallido en el primer request de un
 * deploy) sin esperar el TTL por defecto (15 min) ni forzar un redeploy completo.
 * `updateTag` no aplica acá — solo funciona dentro de Server Actions, no en Route
 * Handlers (ver node_modules/next/dist/docs/.../updateTag.md) — así que usamos
 * `revalidateTag` con `{ expire: 0 }` para expiración inmediata, mismo patrón que el
 * ejemplo oficial de un Route Handler de revalidación. Protegido con
 * `SUPABASE_SERVICE_ROLE_KEY` como secreto — ya existe, no depende de una variable de
 * entorno nueva.
 */
export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("slug");
  // Spec 57: el secreto va en el header `x-revalidate-secret`, no en la URL (las URLs
  // quedan en logs e historiales), y se compara en tiempo constante.
  const secret = request.headers.get("x-revalidate-secret") ?? "";
  const esperado = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

  const a = Buffer.from(secret);
  const b = Buffer.from(esperado);
  if (!esperado || a.length !== b.length || !timingSafeEqual(a, b)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (!slug) {
    return NextResponse.json({ error: "Falta el parámetro slug" }, { status: 400 });
  }

  revalidateTag(`sitio:${slug}`, { expire: 0 });
  return NextResponse.json({ revalidated: true, slug, now: Date.now() });
}
