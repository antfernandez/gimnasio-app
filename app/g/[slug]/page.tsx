import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { cacheTag } from "next/cache";
import { createClient as createPublicClient } from "@supabase/supabase-js";

import { SitioPublicoView } from "@/components/sitio/sitio-publico-view";
import type { ContenidoSitio, TemaSitio } from "@/lib/sitio";

// `connection()` (abajo, en el componente) marca la ruta como dinámica — sin RLS/cookies
// de sesión que la Cache Components API pueda detectar, es la única señal de que este
// componente no debe prerenderizarse. `instant = false` es lo que permite que, siendo
// dinámica, se sirva bloqueante en vez de exigir un <Suspense> alrededor de `connection()`
// (ver next.config error "blocking-prerender-dynamic" si se omite este flag).
export const instant = false;

interface SitioPublicoRow {
  nombre: string;
  tema: TemaSitio;
  color_acento: string;
  contenido: ContenidoSitio;
  publicado_at: string;
}

// Contenido público por tenant: el RPC es `SECURITY DEFINER`, no depende de sesión ni de
// RLS, así que usamos un cliente sin cookies (cacheable e invalidado por tag en cada
// publicación — ver `revalidateSitio` en app/protected/sitio/actions.ts) en vez del
// cliente de @/lib/supabase/server. Con `cacheComponents` activado, sin esto la ruta
// queda prerenderizada una sola vez y `notFound()` se hornea en el shell para siempre —
// ver diagnóstico en .claude/specs/gimnasioappfixsitiopublico (Ajustes para sp15).md.
async function fetchSitio(slug: string): Promise<SitioPublicoRow | null> {
  "use cache";
  cacheTag(`sitio:${slug}`);

  const supabase = createPublicClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
  const { data } = await supabase
    .rpc("obtener_sitio_publico", { p_slug: slug })
    .maybeSingle();
  return (data as SitioPublicoRow | null) ?? null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const sitio = await fetchSitio(slug);
  if (!sitio) return {};

  const descripcion =
    sitio.contenido.hero.subtitulo ||
    `Conoce ${sitio.nombre}: horarios, planes y ubicación.`;

  return {
    title: sitio.nombre,
    description: descripcion,
    openGraph: {
      title: sitio.nombre,
      description: descripcion,
      images: sitio.contenido.hero.imagen_url
        ? [sitio.contenido.hero.imagen_url]
        : undefined,
    },
  };
}

export default async function SitioPublicoPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  // Red de seguridad: si algún dato no cacheable se cuela en el árbol de render, esto
  // igual excluye la página del shell prerenderizado en vez de hornear un 404 para
  // siempre (ver comentario de fetchSitio arriba).
  await connection();
  const { slug } = await params;
  const sitio = await fetchSitio(slug);
  if (!sitio) notFound();

  return (
    <SitioPublicoView
      nombreGimnasio={sitio.nombre}
      tema={sitio.tema}
      colorAcento={sitio.color_acento}
      contenido={sitio.contenido}
    />
  );
}
