"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getPerfilActual } from "@/lib/perfil";
import { createClient } from "@/lib/supabase/server";
import type { CategoriaRutinaPlantilla, EjercicioRutina } from "@/lib/types";

export type RutinaFormState = {
  error?: string;
};

const CATEGORIAS_VALIDAS: CategoriaRutinaPlantilla[] = [
  "musculacion",
  "cardio",
  "general",
];

type FilaCruda = {
  ejercicio_id: string;
  /** Nombre de una fila heredada "Fuera del catálogo" (sin `ejercicio_id`). */
  legacy: string;
  series: number;
  reps: number;
  peso?: string;
  notas: string;
};

function readFilas(formData: FormData): FilaCruda[] {
  const col = (name: string) => formData.getAll(name).map((v) => String(v).trim());
  const ids = col("ejercicio_id");
  const legacy = col("ejercicio_legacy");
  const series = col("series");
  const reps = col("reps");
  const peso = col("peso");
  const notas = col("notas");

  return ids.map((ejercicio_id, i) => ({
    ejercicio_id,
    legacy: legacy[i] ?? "",
    series: Number(series[i]) || 0,
    reps: Number(reps[i]) || 0,
    peso: peso[i] || undefined,
    notas: notas[i] ?? "",
  }));
}

const ERROR_EJERCICIO = "Elige un ejercicio del catálogo.";

/** Convierte las filas del formulario en `EjercicioRutina[]` tomando el nombre
 * **del catálogo**, nunca del cliente. Cada fila nueva o modificada debe traer un
 * `ejercicio_id` que exista, esté activo y sea del gimnasio de la sesión (RLS
 * filtra por gimnasio; el `eq` es defensa extra). Las filas que ya estaban en la
 * plantilla guardada (`previos`) se conservan tal cual: las heredadas por nombre
 * y las que ya tenían `ejercicio_id`, aunque el ejercicio se haya desactivado
 * después. */
async function resolverEjercicios(
  filas: FilaCruda[],
  gimnasioId: string,
  previos: EjercicioRutina[] = [],
): Promise<{ contenido: EjercicioRutina[] } | { error: string }> {
  if (filas.length === 0) {
    return { error: "Agrega al menos un ejercicio a la plantilla." };
  }

  const previosPorId = new Map(
    previos.filter((p) => p.ejercicio_id).map((p) => [p.ejercicio_id!, p.ejercicio]),
  );
  const nombresHeredados = new Set(
    previos.filter((p) => !p.ejercicio_id).map((p) => p.ejercicio),
  );

  const aConsultar = filas
    .filter((f) => f.ejercicio_id && !previosPorId.has(f.ejercicio_id))
    .map((f) => f.ejercicio_id);

  const nombrePorId = new Map<string, string>();
  if (aConsultar.length > 0) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("ejercicios")
      .select("id, nombre")
      .in("id", aConsultar)
      .eq("gimnasio_id", gimnasioId)
      .eq("activo", true);
    for (const e of data ?? []) nombrePorId.set(e.id, e.nombre);
  }

  const contenido: EjercicioRutina[] = [];
  for (const f of filas) {
    let ejercicio: string | undefined;
    let ejercicio_id: string | undefined;

    if (f.ejercicio_id) {
      ejercicio = previosPorId.get(f.ejercicio_id) ?? nombrePorId.get(f.ejercicio_id);
      ejercicio_id = f.ejercicio_id;
    } else if (f.legacy && nombresHeredados.has(f.legacy)) {
      ejercicio = f.legacy;
    }
    if (!ejercicio) return { error: ERROR_EJERCICIO };

    contenido.push({
      ejercicio,
      ...(ejercicio_id ? { ejercicio_id } : {}),
      series: f.series,
      reps: f.reps,
      peso: f.peso,
      notas: f.notas,
    });
  }
  return { contenido };
}

type PlantillaInput = {
  nombre: string;
  categoria: CategoriaRutinaPlantilla;
  objetivo: string | null;
};

function readPlantillaForm(formData: FormData): PlantillaInput | { error: string } {
  const nombre = String(formData.get("nombre") ?? "").trim();
  if (!nombre) {
    return { error: "Ingresa un nombre para la plantilla." };
  }

  const categoria = String(formData.get("categoria") ?? "").trim() as CategoriaRutinaPlantilla;
  if (!CATEGORIAS_VALIDAS.includes(categoria)) {
    return { error: "Selecciona una categoría válida." };
  }

  const objetivo = String(formData.get("objetivo") ?? "").trim() || null;

  return { nombre, categoria, objetivo };
}

export async function createRutina(
  _prevState: RutinaFormState,
  formData: FormData,
): Promise<RutinaFormState> {
  const data = readPlantillaForm(formData);
  if ("error" in data) return data;

  const perfilData = await getPerfilActual();
  if (!perfilData) redirect("/auth/login");

  const resuelto = await resolverEjercicios(
    readFilas(formData),
    perfilData.perfil.gimnasio_id,
  );
  if ("error" in resuelto) return resuelto;

  const supabase = await createClient();
  const { error } = await supabase.from("rutina_plantillas").insert({
    gimnasio_id: perfilData.perfil.gimnasio_id,
    creado_por: perfilData.perfil.id,
    ...data,
    contenido: resuelto.contenido,
  });

  if (error) {
    return { error: "No se pudo guardar la plantilla. Intenta de nuevo." };
  }

  revalidatePath("/protected/rutinas");
  redirect("/protected/rutinas?creada=1");
}

export async function updateRutina(
  id: string,
  _prevState: RutinaFormState,
  formData: FormData,
): Promise<RutinaFormState> {
  const data = readPlantillaForm(formData);
  if ("error" in data) return data;

  const perfilData = await getPerfilActual();
  if (!perfilData) redirect("/auth/login");

  const supabase = await createClient();
  const { data: actual } = await supabase
    .from("rutina_plantillas")
    .select("contenido")
    .eq("id", id)
    .maybeSingle();
  if (!actual) return { error: "La plantilla no existe." };

  const resuelto = await resolverEjercicios(
    readFilas(formData),
    perfilData.perfil.gimnasio_id,
    actual.contenido as EjercicioRutina[],
  );
  if ("error" in resuelto) return resuelto;

  const { error } = await supabase
    .from("rutina_plantillas")
    .update({
      ...data,
      contenido: resuelto.contenido,
      modificado_por: perfilData.perfil.id,
    })
    .eq("id", id);

  if (error) {
    return { error: "No se pudo guardar la plantilla. Intenta de nuevo." };
  }

  revalidatePath("/protected/rutinas");
  redirect("/protected/rutinas?actualizada=1");
}

type ItemPreset = [
  nombreCatalogo: string,
  series: number,
  reps: number,
  peso: string | undefined,
  notas: string,
];

/** Set curado de plantillas genéricas de musculación y cardio, para que el dueño
 * tenga un punto de partida editable — mismo criterio que `aplicarPresetValinor`
 * (turnos/actions.ts, Sprint 8): se aplica cuando el dueño lo pide, no se impone
 * en cada gimnasio nuevo. Cada ítem referencia un ejercicio del catálogo por su
 * nombre exacto del seed (`lib/ejercicios-seed.ts`), por lo que exige el catálogo
 * inicial cargado. El minutaje de los ejercicios de cardio va en `notas` porque
 * el modelo de ejercicio no distingue tiempo de repeticiones. */
export async function aplicarPresetRutinas(): Promise<RutinaFormState> {
  const perfilData = await getPerfilActual();
  if (!perfilData) redirect("/auth/login");

  const musculacion: ItemPreset[] = [
    ["Sentadilla", 4, 10, "40 kg", ""],
    ["Peso muerto con barra", 4, 8, "50 kg", ""],
    ["Press de banca con barra", 4, 10, "30 kg", ""],
    ["Press de banca inclinado con barra", 3, 10, "20 kg", ""],
    ["Press militar", 3, 10, "15 kg", ""],
    ["Sentadilla búlgara con propio peso", 3, 12, "corporal", "Por pierna"],
    ["Remo con barra", 4, 10, "30 kg", ""],
    ["Elevaciones en barra fija (dominadas)", 3, 8, "corporal", "Asistidas si es necesario"],
  ];

  const cardio: ItemPreset[] = [
    ["Bicicleta estática", 1, 0, undefined, "15 minutos, ritmo moderado"],
    ["Cinta / trote", 1, 0, undefined, "20 minutos"],
    ["Salto a la cuerda", 4, 0, undefined, "1 minuto por serie"],
    ["Burpees", 4, 15, undefined, ""],
    ["Remo en máquina", 1, 0, undefined, "10 minutos"],
  ];

  const supabase = await createClient();
  const nombres = [...new Set([...musculacion, ...cardio].map((i) => i[0]))];
  const { data: encontrados } = await supabase
    .from("ejercicios")
    .select("id, nombre")
    .eq("gimnasio_id", perfilData.perfil.gimnasio_id)
    .eq("activo", true)
    .in("nombre", nombres);

  const idPorNombre = new Map((encontrados ?? []).map((e) => [e.nombre, e.id]));
  const faltan = nombres.filter((n) => !idPorNombre.has(n));
  if (faltan.length > 0) {
    return {
      error: `Carga primero el catálogo inicial en Ejercicios. No se encontró en el catálogo: ${faltan.join(", ")}.`,
    };
  }

  const aContenido = (items: ItemPreset[]): EjercicioRutina[] =>
    items.map(([ejercicio, series, reps, peso, notas]) => ({
      ejercicio,
      ejercicio_id: idPorNombre.get(ejercicio),
      series,
      reps,
      peso,
      notas,
    }));

  const { error } = await supabase.from("rutina_plantillas").insert([
    {
      gimnasio_id: perfilData.perfil.gimnasio_id,
      creado_por: perfilData.perfil.id,
      nombre: "Musculación — full body",
      categoria: "musculacion" as CategoriaRutinaPlantilla,
      objetivo: "Fuerza e hipertrofia general",
      contenido: aContenido(musculacion),
    },
    {
      gimnasio_id: perfilData.perfil.gimnasio_id,
      creado_por: perfilData.perfil.id,
      nombre: "Cardio — circuito",
      categoria: "cardio" as CategoriaRutinaPlantilla,
      objetivo: "Resistencia cardiovascular",
      contenido: aContenido(cardio),
    },
  ]);

  if (error) {
    return { error: "No se pudo cargar el set de ejemplo. Intenta de nuevo." };
  }

  revalidatePath("/protected/rutinas");
  return {};
}
