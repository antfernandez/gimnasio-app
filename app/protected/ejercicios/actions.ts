"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { EJERCICIOS_SEED, ZONAS_SEED } from "@/lib/ejercicios-seed";
import { getPerfilActual } from "@/lib/perfil";
import { createClient } from "@/lib/supabase/server";

const UNIQUE_VIOLATION = "23505";
const FK_VIOLATION = "23503";

export type EjercicioFormState = {
  error?: string;
  errores?: Partial<Record<"nombre" | "zona_id" | "url_referencia", string>>;
};

export type CatalogoState = {
  error?: string;
  ok?: boolean;
};

/** Solo el dueño gestiona el catálogo (spec §4). El `gimnasio_id` sale siempre
 * del perfil de la sesión, nunca del cliente. */
async function getDueno() {
  const perfilData = await getPerfilActual();
  if (!perfilData) redirect("/auth/login");
  if (perfilData.perfil.rol !== "dueño") return null;
  return perfilData;
}

const SIN_PERMISO = "Solo el dueño puede gestionar el catálogo de ejercicios.";

function texto(formData: FormData, campo: string): string | null {
  return String(formData.get(campo) ?? "").trim() || null;
}

type EjercicioInput = {
  nombre: string;
  zona_id: string;
  subgrupo: string | null;
  equipo: string | null;
  musculo_principal: string | null;
  musculos_secundarios: string | null;
  posicion_inicial: string | null;
  ejecucion: string | null;
  notas: string | null;
  url_referencia: string | null;
};

function readEjercicioForm(
  formData: FormData,
): EjercicioInput | EjercicioFormState {
  const errores: NonNullable<EjercicioFormState["errores"]> = {};
  const nombre = texto(formData, "nombre");
  const zona_id = texto(formData, "zona_id");
  const url_referencia = texto(formData, "url_referencia");

  if (!nombre) errores.nombre = "Ingresa un nombre para el ejercicio.";
  if (!zona_id) errores.zona_id = "Elige una zona del cuerpo.";
  if (url_referencia && !/^https?:\/\/\S+$/i.test(url_referencia)) {
    errores.url_referencia = "Ingresa una URL válida que empiece con http:// o https://.";
  }
  if (Object.keys(errores).length > 0) {
    return { error: "Revisa los campos marcados.", errores };
  }

  return {
    nombre: nombre!,
    zona_id: zona_id!,
    subgrupo: texto(formData, "subgrupo"),
    equipo: texto(formData, "equipo"),
    musculo_principal: texto(formData, "musculo_principal"),
    musculos_secundarios: texto(formData, "musculos_secundarios"),
    posicion_inicial: texto(formData, "posicion_inicial"),
    ejecucion: texto(formData, "ejecucion"),
    notas: texto(formData, "notas"),
    url_referencia,
  };
}

function errorGuardado(code: string | undefined): EjercicioFormState {
  if (code === UNIQUE_VIOLATION) {
    return {
      error: "Ya existe un ejercicio con ese nombre en esa zona.",
      errores: { nombre: "Ya existe un ejercicio con ese nombre en esa zona." },
    };
  }
  return { error: "No se pudo guardar el ejercicio. Intenta de nuevo." };
}

export async function crearEjercicio(
  _prev: EjercicioFormState,
  formData: FormData,
): Promise<EjercicioFormState> {
  const dueno = await getDueno();
  if (!dueno) return { error: SIN_PERMISO };

  const data = readEjercicioForm(formData);
  if ("error" in data || "errores" in data) return data as EjercicioFormState;

  const supabase = await createClient();
  const { error } = await supabase.from("ejercicios").insert({
    ...(data as EjercicioInput),
    gimnasio_id: dueno.perfil.gimnasio_id,
    creado_por: dueno.perfil.id,
    origen: "manual",
  });
  if (error) return errorGuardado(error.code);

  revalidatePath("/protected/ejercicios");
  redirect("/protected/ejercicios?creado=1");
}

export async function actualizarEjercicio(
  id: string,
  _prev: EjercicioFormState,
  formData: FormData,
): Promise<EjercicioFormState> {
  const dueno = await getDueno();
  if (!dueno) return { error: SIN_PERMISO };

  const data = readEjercicioForm(formData);
  if ("error" in data || "errores" in data) return data as EjercicioFormState;

  const supabase = await createClient();
  const { error } = await supabase
    .from("ejercicios")
    .update({ ...(data as EjercicioInput), modificado_por: dueno.perfil.id })
    .eq("id", id)
    .eq("gimnasio_id", dueno.perfil.gimnasio_id);
  if (error) return errorGuardado(error.code);

  revalidatePath("/protected/ejercicios");
  redirect(`/protected/ejercicios/${id}?actualizado=1`);
}

/** Eliminar no afecta rutinas ya asignadas: `contenido` guarda el nombre como
 * snapshot y no hay FK hacia `ejercicios` (spec §3.2). */
export async function eliminarEjercicio(id: string): Promise<CatalogoState> {
  const dueno = await getDueno();
  if (!dueno) return { error: SIN_PERMISO };

  const supabase = await createClient();
  const { error } = await supabase
    .from("ejercicios")
    .delete()
    .eq("id", id)
    .eq("gimnasio_id", dueno.perfil.gimnasio_id);
  if (error) return { error: "No se pudo eliminar el ejercicio. Intenta de nuevo." };

  revalidatePath("/protected/ejercicios");
  redirect("/protected/ejercicios?eliminado=1");
}

export async function alternarActivoEjercicio(
  id: string,
  activo: boolean,
): Promise<CatalogoState> {
  const dueno = await getDueno();
  if (!dueno) return { error: SIN_PERMISO };

  const supabase = await createClient();
  const { error } = await supabase
    .from("ejercicios")
    .update({ activo, modificado_por: dueno.perfil.id })
    .eq("id", id)
    .eq("gimnasio_id", dueno.perfil.gimnasio_id);
  if (error) return { error: "No se pudo actualizar el ejercicio. Intenta de nuevo." };

  revalidatePath("/protected/ejercicios");
  revalidatePath(`/protected/ejercicios/${id}`);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Zonas
// ---------------------------------------------------------------------------

export async function crearZona(
  _prev: CatalogoState,
  formData: FormData,
): Promise<CatalogoState> {
  const dueno = await getDueno();
  if (!dueno) return { error: SIN_PERMISO };

  const nombre = texto(formData, "nombre");
  if (!nombre) return { error: "Ingresa un nombre para la zona." };

  const supabase = await createClient();
  const { data: ultima } = await supabase
    .from("zonas_cuerpo")
    .select("orden")
    .eq("gimnasio_id", dueno.perfil.gimnasio_id)
    .order("orden", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("zonas_cuerpo").insert({
    gimnasio_id: dueno.perfil.gimnasio_id,
    nombre,
    orden: (ultima?.orden ?? 0) + 1,
  });
  if (error) {
    return {
      error:
        error.code === UNIQUE_VIOLATION
          ? "Ya existe una zona con ese nombre."
          : "No se pudo crear la zona. Intenta de nuevo.",
    };
  }

  revalidatePath("/protected/ejercicios", "layout");
  return { ok: true };
}

export async function renombrarZona(
  id: string,
  _prev: CatalogoState,
  formData: FormData,
): Promise<CatalogoState> {
  const dueno = await getDueno();
  if (!dueno) return { error: SIN_PERMISO };

  const nombre = texto(formData, "nombre");
  if (!nombre) return { error: "Ingresa un nombre para la zona." };

  const supabase = await createClient();
  const { data: zona } = await supabase
    .from("zonas_cuerpo")
    .select("es_sistema")
    .eq("id", id)
    .eq("gimnasio_id", dueno.perfil.gimnasio_id)
    .maybeSingle();
  if (!zona) return { error: "La zona no existe." };
  if (zona.es_sistema) return { error: "Las zonas del sistema no se pueden renombrar." };

  const { error } = await supabase
    .from("zonas_cuerpo")
    .update({ nombre })
    .eq("id", id)
    .eq("gimnasio_id", dueno.perfil.gimnasio_id);
  if (error) {
    return {
      error:
        error.code === UNIQUE_VIOLATION
          ? "Ya existe una zona con ese nombre."
          : "No se pudo renombrar la zona. Intenta de nuevo.",
    };
  }

  revalidatePath("/protected/ejercicios", "layout");
  return { ok: true };
}

/** Mueve una zona una posición arriba o abajo intercambiando su `orden` con la
 * vecina. Se renumera la lista completa para que `orden` quede consecutivo
 * aunque haya empates o huecos. */
export async function reordenarZonas(
  id: string,
  direccion: "arriba" | "abajo",
): Promise<CatalogoState> {
  const dueno = await getDueno();
  if (!dueno) return { error: SIN_PERMISO };

  const supabase = await createClient();
  const { data: zonas } = await supabase
    .from("zonas_cuerpo")
    .select("id, orden")
    .eq("gimnasio_id", dueno.perfil.gimnasio_id)
    .order("orden", { ascending: true })
    .order("nombre", { ascending: true });

  const lista = zonas ?? [];
  const i = lista.findIndex((z) => z.id === id);
  const j = direccion === "arriba" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= lista.length) return { ok: true };

  [lista[i], lista[j]] = [lista[j], lista[i]];
  const resultados = await Promise.all(
    lista.map((z, idx) =>
      supabase
        .from("zonas_cuerpo")
        .update({ orden: idx + 1 })
        .eq("id", z.id)
        .eq("gimnasio_id", dueno.perfil.gimnasio_id),
    ),
  );
  if (resultados.some((r) => r.error)) {
    return { error: "No se pudo reordenar las zonas. Intenta de nuevo." };
  }

  revalidatePath("/protected/ejercicios", "layout");
  return { ok: true };
}

export async function eliminarZona(id: string): Promise<CatalogoState> {
  const dueno = await getDueno();
  if (!dueno) return { error: SIN_PERMISO };

  const supabase = await createClient();
  const { data: zona } = await supabase
    .from("zonas_cuerpo")
    .select("es_sistema")
    .eq("id", id)
    .eq("gimnasio_id", dueno.perfil.gimnasio_id)
    .maybeSingle();
  if (!zona) return { error: "La zona no existe." };
  if (zona.es_sistema) return { error: "Las zonas del sistema no se pueden eliminar." };

  const { error } = await supabase
    .from("zonas_cuerpo")
    .delete()
    .eq("id", id)
    .eq("gimnasio_id", dueno.perfil.gimnasio_id);
  if (error) {
    return {
      error:
        error.code === FK_VIOLATION
          ? "No se puede eliminar una zona que tiene ejercicios."
          : "No se pudo eliminar la zona. Intenta de nuevo.",
    };
  }

  revalidatePath("/protected/ejercicios", "layout");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Carga inicial
// ---------------------------------------------------------------------------

/** Inserta las zonas y ejercicios del seed con `origen = 'seed'`. Idempotente:
 * `ignoreDuplicates` sobre las claves únicas, así re-ejecutarlo no duplica ni
 * pisa ediciones del dueño. */
export async function aplicarCatalogoInicial(): Promise<CatalogoState> {
  const dueno = await getDueno();
  if (!dueno) return { error: SIN_PERMISO };

  const gimnasioId = dueno.perfil.gimnasio_id;
  const supabase = await createClient();

  const { error: zonasError } = await supabase.from("zonas_cuerpo").upsert(
    ZONAS_SEED.map((z) => ({ ...z, gimnasio_id: gimnasioId })),
    { onConflict: "gimnasio_id,nombre", ignoreDuplicates: true },
  );
  if (zonasError) {
    return { error: "No se pudo cargar el catálogo inicial. Intenta de nuevo." };
  }

  const { data: zonas, error: leerError } = await supabase
    .from("zonas_cuerpo")
    .select("id, nombre")
    .eq("gimnasio_id", gimnasioId);
  if (leerError || !zonas) {
    return { error: "No se pudo cargar el catálogo inicial. Intenta de nuevo." };
  }
  const zonaPorNombre = new Map(zonas.map((z) => [z.nombre, z.id]));

  const filas = EJERCICIOS_SEED.flatMap(({ zona, ...e }) => {
    const zona_id = zonaPorNombre.get(zona);
    return zona_id
      ? [{ ...e, zona_id, gimnasio_id: gimnasioId, origen: "seed", creado_por: dueno.perfil.id }]
      : [];
  });

  const { error } = await supabase
    .from("ejercicios")
    .upsert(filas, { onConflict: "gimnasio_id,zona_id,nombre", ignoreDuplicates: true });
  if (error) {
    return { error: "No se pudo cargar el catálogo inicial. Intenta de nuevo." };
  }

  revalidatePath("/protected/ejercicios", "layout");
  revalidatePath("/protected/rutinas", "layout");
  return { ok: true };
}
