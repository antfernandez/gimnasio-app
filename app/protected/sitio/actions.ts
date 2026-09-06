"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";

import { getPerfilActual } from "@/lib/perfil";
import { normalizarContenido, type ContenidoSitio, type TemaSitio } from "@/lib/sitio";
import { createClient } from "@/lib/supabase/server";

const MAX_VERSIONES = 10;

export type GuardarBorradorResult = { ok: true } | { ok: false; error: string };

/** Autoguardado: se llama directo (no vía `<form action>`) desde el editor, con
 * debounce en el cliente — ver components/sitio/editor-sitio.tsx. */
export async function guardarBorrador(
  tema: TemaSitio,
  colorAcento: string,
  contenido: ContenidoSitio,
): Promise<GuardarBorradorResult> {
  const perfilData = await getPerfilActual();
  if (!perfilData) redirect("/auth/login");

  const supabase = await createClient();
  const { error } = await supabase
    .from("sitios")
    .update({ tema, color_acento: colorAcento, contenido_borrador: contenido })
    .eq("gimnasio_id", perfilData.perfil.gimnasio_id);

  if (error) {
    return { ok: false, error: "No se pudo guardar el borrador." };
  }

  return { ok: true };
}

export type PublicarResult = { ok: true; publicadoAt: string } | { ok: false; error: string };

export async function publicarSitio(): Promise<PublicarResult> {
  const perfilData = await getPerfilActual();
  if (!perfilData) redirect("/auth/login");

  const gimnasioId = perfilData.perfil.gimnasio_id;
  const supabase = await createClient();

  const { data: sitio, error: leerError } = await supabase
    .from("sitios")
    .select("tema, color_acento, contenido_borrador")
    .eq("gimnasio_id", gimnasioId)
    .single();

  if (leerError || !sitio) {
    return { ok: false, error: "No se pudo leer el borrador." };
  }

  const publicadoAt = new Date().toISOString();
  const { error: publicarError } = await supabase
    .from("sitios")
    .update({
      contenido_publicado: sitio.contenido_borrador,
      publicado_at: publicadoAt,
    })
    .eq("gimnasio_id", gimnasioId);

  if (publicarError) {
    return { ok: false, error: "No se pudo publicar el sitio." };
  }

  await supabase.from("sitio_versiones").insert({
    gimnasio_id: gimnasioId,
    tema: sitio.tema,
    color_acento: sitio.color_acento,
    contenido: sitio.contenido_borrador,
  });

  // Recorta a las últimas MAX_VERSIONES — sin esto la tabla crece sin límite.
  const { data: viejas } = await supabase
    .from("sitio_versiones")
    .select("id")
    .eq("gimnasio_id", gimnasioId)
    .order("created_at", { ascending: false })
    .range(MAX_VERSIONES, MAX_VERSIONES + 100);
  if (viejas && viejas.length > 0) {
    await supabase
      .from("sitio_versiones")
      .delete()
      .in("id", viejas.map((v) => v.id));
  }

  revalidatePath("/protected/sitio");
  // Invalida el `fetchSitio` cacheado de app/g/[slug]/page.tsx (Sprint 16) para que el
  // sitio público refleje esta publicación sin esperar a un redeploy.
  updateTag(`sitio:${perfilData.gimnasio.slug}`);
  return { ok: true, publicadoAt };
}

export interface VersionSitio {
  id: string;
  tema: TemaSitio;
  color_acento: string;
  contenido: ContenidoSitio;
  created_at: string;
}

export async function listarVersiones(): Promise<VersionSitio[]> {
  const perfilData = await getPerfilActual();
  if (!perfilData) redirect("/auth/login");

  const supabase = await createClient();
  const { data } = await supabase
    .from("sitio_versiones")
    .select("*")
    .eq("gimnasio_id", perfilData.perfil.gimnasio_id)
    .order("created_at", { ascending: false })
    .limit(MAX_VERSIONES);

  // Sprint 21 Parte D: versiones publicadas antes de este sprint no tienen los campos
  // nuevos — normalizar acá cubre tanto el listado como el `setContenido(version.contenido)`
  // que hace el editor al restaurar (ver `handleRestaurar` en editor-sitio.tsx).
  return ((data ?? []) as VersionSitio[]).map((v) => ({
    ...v,
    contenido: normalizarContenido(v.contenido),
  }));
}

/** Restaura una versión publicada anterior AL BORRADOR (no la vuelve a publicar sola
 * — el dueño revisa en la vista previa y publica de nuevo si quiere dejarla en vivo). */
export async function restaurarVersion(
  versionId: string,
): Promise<GuardarBorradorResult> {
  const perfilData = await getPerfilActual();
  if (!perfilData) redirect("/auth/login");

  const supabase = await createClient();
  const { data: version, error: leerError } = await supabase
    .from("sitio_versiones")
    .select("*")
    .eq("id", versionId)
    .eq("gimnasio_id", perfilData.perfil.gimnasio_id)
    .single();

  if (leerError || !version) {
    return { ok: false, error: "No se encontró esa versión." };
  }

  const { error } = await supabase
    .from("sitios")
    .update({
      tema: version.tema,
      color_acento: version.color_acento,
      contenido_borrador: normalizarContenido(version.contenido),
    })
    .eq("gimnasio_id", perfilData.perfil.gimnasio_id);

  if (error) {
    return { ok: false, error: "No se pudo restaurar la versión." };
  }

  revalidatePath("/protected/sitio");
  return { ok: true };
}
