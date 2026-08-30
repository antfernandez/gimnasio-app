import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { SitioPublicoView } from "@/components/sitio/sitio-publico-view";
import type { ContenidoSitio, TemaSitio } from "@/lib/sitio";
import { createClient } from "@/lib/supabase/server";

// Contenido publicado por tenant, consultado en cada visita (RPC `obtener_sitio_publico`)
// — mismo motivo que /protected/layout.tsx: sin esto, Next intenta prerenderizar la
// ruta estáticamente y falla porque el cliente de Supabase depende de `cookies()`.
export const instant = false;

interface SitioPublicoRow {
  nombre: string;
  tema: TemaSitio;
  color_acento: string;
  contenido: ContenidoSitio;
  publicado_at: string;
}

async function fetchSitio(slug: string): Promise<SitioPublicoRow | null> {
  const supabase = await createClient();
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
