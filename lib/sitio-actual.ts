import type { SupabaseClient } from "@supabase/supabase-js";
import { cache } from "react";

import { getPerfilActual } from "@/lib/perfil";
import { contenidoVacio, normalizarContenido, type Sitio } from "@/lib/sitio";
import { createClient } from "@/lib/supabase/server";

async function ensureSitio(
  supabase: SupabaseClient,
  gimnasioId: string,
  nombreGimnasio: string,
): Promise<Sitio | null> {
  const { data: existente } = await supabase
    .from("sitios")
    .select("*")
    .eq("gimnasio_id", gimnasioId)
    .maybeSingle();

  // `normalizarContenido` rellena campos agregados después de que el gimnasio guardó su
  // borrador (ver Sprint 21 Parte D) — sin esto, abrir el editor de un gimnasio con
  // contenido viejo revienta al leer `contenido.galeria[i].url` sobre un string.
  if (existente) {
    return { ...existente, contenido_borrador: normalizarContenido(existente.contenido_borrador) } as Sitio;
  }

  const { data: creado, error } = await supabase
    .from("sitios")
    .insert({
      gimnasio_id: gimnasioId,
      contenido_borrador: contenidoVacio(nombreGimnasio),
    })
    .select()
    .single();

  if (error || !creado) {
    console.error("No se pudo crear el sitio del gimnasio", error);
    return null;
  }

  return creado as Sitio;
}

export const getSitioActual = cache(async (): Promise<{
  sitio: Sitio;
  gimnasioNombre: string;
} | null> => {
  const perfilData = await getPerfilActual();
  if (!perfilData) return null;

  const supabase = await createClient();
  const sitio = await ensureSitio(
    supabase,
    perfilData.perfil.gimnasio_id,
    perfilData.gimnasio.nombre,
  );
  if (!sitio) return null;

  return { sitio, gimnasioNombre: perfilData.gimnasio.nombre };
});
