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

function readEjercicios(formData: FormData): EjercicioRutina[] {
  const ejercicios = formData.getAll("ejercicio").map((v) => String(v).trim());
  const series = formData.getAll("series").map((v) => String(v).trim());
  const reps = formData.getAll("reps").map((v) => String(v).trim());
  const notas = formData.getAll("notas").map((v) => String(v).trim());

  return ejercicios
    .map((ejercicio, i) => ({
      ejercicio,
      series: Number(series[i]) || 0,
      reps: Number(reps[i]) || 0,
      notas: notas[i] ?? "",
    }))
    .filter((e) => e.ejercicio.length > 0);
}

type PlantillaInput = {
  nombre: string;
  categoria: CategoriaRutinaPlantilla;
  objetivo: string | null;
  contenido: EjercicioRutina[];
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

  const contenido = readEjercicios(formData);
  if (contenido.length === 0) {
    return { error: "Agrega al menos un ejercicio a la plantilla." };
  }

  return { nombre, categoria, objetivo, contenido };
}

export async function createRutina(
  _prevState: RutinaFormState,
  formData: FormData,
): Promise<RutinaFormState> {
  const data = readPlantillaForm(formData);
  if ("error" in data) return data;

  const perfilData = await getPerfilActual();
  if (!perfilData) redirect("/auth/login");

  const supabase = await createClient();
  const { error } = await supabase.from("rutina_plantillas").insert({
    gimnasio_id: perfilData.perfil.gimnasio_id,
    creado_por: perfilData.perfil.id,
    ...data,
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
  const { error } = await supabase
    .from("rutina_plantillas")
    .update({ ...data, modificado_por: perfilData.perfil.id })
    .eq("id", id);

  if (error) {
    return { error: "No se pudo guardar la plantilla. Intenta de nuevo." };
  }

  revalidatePath("/protected/rutinas");
  redirect("/protected/rutinas?actualizada=1");
}

/** Set curado de plantillas genéricas de musculación y cardio, para que el dueño
 * tenga un punto de partida editable — mismo criterio que `aplicarPresetValinor`
 * (turnos/actions.ts, Sprint 8): se aplica cuando el dueño lo pide, no se impone
 * en cada gimnasio nuevo. El minutaje de los ejercicios de cardio va en `notas`
 * porque el modelo de ejercicio no distingue tiempo de repeticiones. */
export async function aplicarPresetRutinas(): Promise<RutinaFormState> {
  const perfilData = await getPerfilActual();
  if (!perfilData) redirect("/auth/login");

  const musculacion: EjercicioRutina[] = [
    { ejercicio: "Sentadilla", series: 4, reps: 10, notas: "" },
    { ejercicio: "Peso muerto", series: 4, reps: 8, notas: "" },
    { ejercicio: "Press de banca", series: 4, reps: 10, notas: "" },
    { ejercicio: "Press inclinado", series: 3, reps: 10, notas: "" },
    { ejercicio: "Press militar", series: 3, reps: 10, notas: "" },
    { ejercicio: "Búlgaras", series: 3, reps: 12, notas: "Por pierna" },
    { ejercicio: "Remo con barra", series: 4, reps: 10, notas: "" },
    { ejercicio: "Dominadas", series: 3, reps: 8, notas: "Asistidas si es necesario" },
  ];

  const cardio: EjercicioRutina[] = [
    { ejercicio: "Bicicleta estática", series: 1, reps: 0, notas: "15 minutos, ritmo moderado" },
    { ejercicio: "Cinta / trote", series: 1, reps: 0, notas: "20 minutos" },
    { ejercicio: "Salto a la cuerda", series: 4, reps: 0, notas: "1 minuto por serie" },
    { ejercicio: "Burpees", series: 4, reps: 15, notas: "" },
    { ejercicio: "Escalador", series: 4, reps: 0, notas: "45 segundos por serie" },
    { ejercicio: "Remo (máquina)", series: 1, reps: 0, notas: "10 minutos" },
  ];

  const supabase = await createClient();
  const { error } = await supabase.from("rutina_plantillas").insert([
    {
      gimnasio_id: perfilData.perfil.gimnasio_id,
      creado_por: perfilData.perfil.id,
      nombre: "Musculación — full body",
      categoria: "musculacion" as CategoriaRutinaPlantilla,
      objetivo: "Fuerza e hipertrofia general",
      contenido: musculacion,
    },
    {
      gimnasio_id: perfilData.perfil.gimnasio_id,
      creado_por: perfilData.perfil.id,
      nombre: "Cardio — circuito",
      categoria: "cardio" as CategoriaRutinaPlantilla,
      objetivo: "Resistencia cardiovascular",
      contenido: cardio,
    },
  ]);

  if (error) {
    return { error: "No se pudo cargar el set de ejemplo. Intenta de nuevo." };
  }

  revalidatePath("/protected/rutinas");
  return {};
}
