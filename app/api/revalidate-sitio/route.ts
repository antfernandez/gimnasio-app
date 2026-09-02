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
  const secret = request.nextUrl.searchParams.get("secret");

  if (!slug) {
    return NextResponse.json({ error: "Falta el parámetro slug" }, { status: 400 });
  }
  if (secret !== process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  revalidateTag(`sitio:${slug}`, { expire: 0 });
  return NextResponse.json({ revalidated: true, slug, now: Date.now() });
}
