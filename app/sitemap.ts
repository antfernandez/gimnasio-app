import type { MetadataRoute } from "next";

import { createClient } from "@/lib/supabase/server";

// Mismo criterio que app/layout.tsx (Sprint 16): `NEXT_PUBLIC_SITE_URL` es el dominio
// estable de producción; `VERCEL_URL` (efímero, cambia en cada deploy) queda solo como
// respaldo en preview/local.
const defaultUrl = process.env.NEXT_PUBLIC_SITE_URL
  ? process.env.NEXT_PUBLIC_SITE_URL
  : process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("listar_sitios_publicados");
  const slugs = ((data ?? []) as { slug: string }[]).map((s) => s.slug);

  return [
    {
      url: defaultUrl,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    ...slugs.map((slug) => ({
      url: `${defaultUrl}/g/${slug}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}
