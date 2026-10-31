"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getPerfilActual } from "@/lib/perfil";
import {
  CATEGORIAS_ALIMENTO,
  DIFICULTADES,
  ESTADOS_ASIGNACION,
  ESTADOS_PLAN,
  OBJETIVOS,
  TIPOS_RECETA,
  calcularFechaFin,
  esUrlHttp,
  type CategoriaAlimento,
  type DificultadReceta,
  type EstadoAsignacion,
  type EstadoPlanNutricional,
  type ObjetivoNutricional,
  type TipoReceta,
} from "@/lib/nutricion";
import { createClient } from "@/lib/supabase/server";

export type NutricionFormState = {
  error?: string;
};

const UNIQUE_VIOLATION = "23505";
const FK_VIOLATION = "23503";

const trim = (fd: FormData, key: string) => String(fd.get(key) ?? "").trim();

/** Número opcional: vacío → null; inválido o negativo → `undefined` (error). */
function numeroOpcional(valor: string): number | null | undefined {
  if (!valor) return null;
  const n = Number(valor.replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

function enLista<T extends string>(lista: { value: T }[], valor: string): valor is T {
  return lista.some((i) => i.value === valor);
}

// ============================================================================
// Alimentos
// ============================================================================

export async function guardarAlimento(
  id: string | null,
  _prev: NutricionFormState,
  formData: FormData,
): Promise<NutricionFormState> {
  const perfilData = await getPerfilActual();
  if (!perfilData) redirect("/auth/login");

  const nombre = trim(formData, "nombre");
  if (!nombre) return { error: "Ingresa un nombre para el alimento." };

  const categoria = trim(formData, "categoria");
  if (!enLista(CATEGORIAS_ALIMENTO, categoria)) {
    return { error: "Selecciona una categoría válida." };
  }

  const calorias = numeroOpcional(trim(formData, "calorias"));
  const proteina = numeroOpcional(trim(formData, "proteina"));
  const carbohidratos = numeroOpcional(trim(formData, "carbohidratos"));
  const grasas = numeroOpcional(trim(formData, "grasas"));
  if ([calorias, proteina, carbohidratos, grasas].some((v) => v === undefined)) {
    return { error: "Los valores nutricionales deben ser números mayores o iguales a 0." };
  }

  const unidadPorcion = trim(formData, "unidad_porcion") || null;
  const gramosPorcion = numeroOpcional(trim(formData, "gramos_porcion"));
  if (gramosPorcion === undefined || gramosPorcion === 0) {
    return { error: "Los gramos por porción deben ser un número mayor que 0." };
  }
  if ((unidadPorcion === null) !== (gramosPorcion === null)) {
    return { error: "Indica la unidad de porción y sus gramos, o deja ambos vacíos." };
  }

  const datos = {
    nombre,
    categoria: categoria as CategoriaAlimento,
    calorias: calorias ?? 0,
    proteina: proteina ?? 0,
    carbohidratos: carbohidratos ?? 0,
    grasas: grasas ?? 0,
    unidad_porcion: unidadPorcion,
    gramos_porcion: gramosPorcion,
  };

  const supabase = await createClient();
  const { error } = id
    ? await supabase
        .from("alimentos")
        .update(datos)
        .eq("id", id)
        .eq("gimnasio_id", perfilData.perfil.gimnasio_id)
    : await supabase.from("alimentos").insert({
        ...datos,
        gimnasio_id: perfilData.perfil.gimnasio_id,
        creado_por: perfilData.perfil.id,
      });

  if (error) {
    if (error.code === UNIQUE_VIOLATION) return { error: "Ya existe un alimento con ese nombre." };
    return { error: "No se pudo guardar el alimento. Intenta de nuevo." };
  }

  revalidatePath("/protected/nutricion/alimentos");
  redirect(`/protected/nutricion/alimentos?guardado=${Date.now()}`);
}

export async function eliminarAlimento(id: string): Promise<NutricionFormState> {
  const perfilData = await getPerfilActual();
  if (!perfilData) redirect("/auth/login");

  const supabase = await createClient();
  const { data: usos } = await supabase
    .from("receta_ingredientes")
    .select("receta_id")
    .eq("alimento_id", id);
  const enRecetas = new Set((usos ?? []).map((u) => u.receta_id as string)).size;
  if (enRecetas > 0) {
    return { error: `Está en uso en ${enRecetas} ${enRecetas === 1 ? "receta" : "recetas"}.` };
  }

  const { error } = await supabase
    .from("alimentos")
    .delete()
    .eq("id", id)
    .eq("gimnasio_id", perfilData.perfil.gimnasio_id);
  if (error) {
    if (error.code === FK_VIOLATION) {
      return { error: "No se puede eliminar: el alimento se usa en alguna receta." };
    }
    return { error: "No se pudo eliminar el alimento. Intenta de nuevo." };
  }

  revalidatePath("/protected/nutricion/alimentos");
  return {};
}

// ============================================================================
// Recetas
// ============================================================================

type IngredienteInput = {
  alimento_id: string | null;
  nombre_manual: string | null;
  cantidad: number;
  unidad: "g" | "porcion";
};

function leerIngredientes(formData: FormData): IngredienteInput[] | { error: string } {
  let crudo: unknown;
  try {
    crudo = JSON.parse(trim(formData, "ingredientes") || "[]");
  } catch {
    return { error: "No se pudieron leer los ingredientes." };
  }
  if (!Array.isArray(crudo)) return { error: "No se pudieron leer los ingredientes." };

  const resultado: IngredienteInput[] = [];
  for (const item of crudo as Record<string, unknown>[]) {
    const alimentoId = typeof item.alimento_id === "string" && item.alimento_id ? item.alimento_id : null;
    const manual = typeof item.nombre_manual === "string" ? item.nombre_manual.trim() : "";
    const cantidad = Number(item.cantidad);
    const unidad = item.unidad === "porcion" ? "porcion" : "g";
    if (!alimentoId && !manual) continue; // fila vacía
    if (!Number.isFinite(cantidad) || cantidad <= 0) {
      return { error: "Cada ingrediente necesita una cantidad mayor que 0." };
    }
    resultado.push({
      alimento_id: alimentoId,
      nombre_manual: alimentoId ? null : manual,
      cantidad,
      unidad: alimentoId ? unidad : "g",
    });
  }
  return resultado;
}

export async function guardarReceta(
  id: string | null,
  _prev: NutricionFormState,
  formData: FormData,
): Promise<NutricionFormState> {
  const perfilData = await getPerfilActual();
  if (!perfilData) redirect("/auth/login");
  const gimnasioId = perfilData.perfil.gimnasio_id;

  const nombre = trim(formData, "nombre");
  if (!nombre) return { error: "Ingresa un nombre para la receta." };

  const tipo = trim(formData, "tipo");
  const dificultad = trim(formData, "dificultad");
  const estado = trim(formData, "estado");
  if (!enLista(TIPOS_RECETA, tipo)) return { error: "Selecciona un tipo de comida válido." };
  if (!enLista(DIFICULTADES, dificultad)) return { error: "Selecciona una dificultad válida." };
  if (estado !== "activo" && estado !== "borrador") return { error: "Selecciona un estado válido." };

  const porciones = Number(trim(formData, "porciones") || "1");
  if (!Number.isInteger(porciones) || porciones <= 0) {
    return { error: "Las porciones deben ser un número entero mayor que 0." };
  }
  const tiempo = numeroOpcional(trim(formData, "tiempo_min"));
  if (tiempo === undefined) return { error: "El tiempo debe ser un número de minutos válido." };

  const urlVideo = trim(formData, "url_video") || null;
  if (urlVideo && !esUrlHttp(urlVideo)) {
    return { error: "El video debe ser una URL que empiece con http:// o https://." };
  }

  const ingredientes = leerIngredientes(formData);
  if ("error" in ingredientes) return ingredientes;

  // Spec 51: la foto ya se subió desde el navegador; aquí solo se valida que la ruta sea
  // de la carpeta del propio gimnasio (la RLS de Storage lo exige igual al subir).
  const fotoPath = trim(formData, "foto_path") || null;
  if (fotoPath && (!fotoPath.startsWith(`${gimnasioId}/`) || fotoPath.includes(".."))) {
    return { error: "La foto no es válida. Súbela de nuevo." };
  }

  const datos = {
    nombre,
    tipo: tipo as TipoReceta,
    dificultad: dificultad as DificultadReceta,
    porciones,
    tiempo_min: tiempo === null ? null : Math.round(tiempo),
    descripcion: trim(formData, "descripcion") || null,
    preparacion: trim(formData, "preparacion") || null,
    estado,
    url_video: urlVideo,
    foto_path: fotoPath,
  };

  const supabase = await createClient();
  let recetaId = id;
  let fotoAnterior: string | null = null;
  if (id) {
    const { data: previa } = await supabase
      .from("recetas")
      .select("foto_path")
      .eq("id", id)
      .eq("gimnasio_id", gimnasioId)
      .maybeSingle();
    fotoAnterior = (previa?.foto_path as string | null) ?? null;
    const { error } = await supabase
      .from("recetas")
      .update(datos)
      .eq("id", id)
      .eq("gimnasio_id", gimnasioId);
    if (error) {
      if (error.code === UNIQUE_VIOLATION) return { error: "Ya existe una receta con ese nombre." };
      return { error: "No se pudo guardar la receta. Intenta de nuevo." };
    }
  } else {
    const { data, error } = await supabase
      .from("recetas")
      .insert({ ...datos, gimnasio_id: gimnasioId, creado_por: perfilData.perfil.id })
      .select("id")
      .single();
    if (error || !data) {
      if (error?.code === UNIQUE_VIOLATION) return { error: "Ya existe una receta con ese nombre." };
      return { error: "No se pudo guardar la receta. Intenta de nuevo." };
    }
    recetaId = data.id as string;
  }

  // Los ingredientes se reemplazan completos (la receta es chica).
  const { error: delError } = await supabase
    .from("receta_ingredientes")
    .delete()
    .eq("receta_id", recetaId!);
  if (delError) return { error: "No se pudieron guardar los ingredientes. Intenta de nuevo." };

  if (ingredientes.length > 0) {
    const { error: insError } = await supabase.from("receta_ingredientes").insert(
      ingredientes.map((ing, orden) => ({
        ...ing,
        orden,
        receta_id: recetaId!,
        gimnasio_id: gimnasioId,
      })),
    );
    if (insError) return { error: "No se pudieron guardar los ingredientes. Intenta de nuevo." };
  }

  // Foto reemplazada o quitada: se borra el objeto anterior.
  if (fotoAnterior && fotoAnterior !== fotoPath) {
    await supabase.storage.from("recetas-fotos").remove([fotoAnterior]);
  }

  revalidatePath("/protected/nutricion/recetas");
  revalidatePath("/protected/nutricion/planes");
  redirect("/protected/nutricion/recetas?guardado=1");
}

export async function eliminarReceta(id: string): Promise<NutricionFormState> {
  const perfilData = await getPerfilActual();
  if (!perfilData) redirect("/auth/login");

  const supabase = await createClient();
  const { data: previa } = await supabase
    .from("recetas")
    .select("foto_path")
    .eq("id", id)
    .eq("gimnasio_id", perfilData.perfil.gimnasio_id)
    .maybeSingle();
  const { error } = await supabase
    .from("recetas")
    .delete()
    .eq("id", id)
    .eq("gimnasio_id", perfilData.perfil.gimnasio_id);
  if (error) {
    if (error.code === FK_VIOLATION) {
      return { error: "No se puede eliminar: la receta está en algún plan nutricional." };
    }
    return { error: "No se pudo eliminar la receta. Intenta de nuevo." };
  }
  if (previa?.foto_path) await supabase.storage.from("recetas-fotos").remove([previa.foto_path as string]);

  revalidatePath("/protected/nutricion/recetas");
  return {};
}

// ============================================================================
// Planes nutricionales
// ============================================================================

export async function guardarPlanNutricional(
  id: string | null,
  _prev: NutricionFormState,
  formData: FormData,
): Promise<NutricionFormState> {
  const perfilData = await getPerfilActual();
  if (!perfilData) redirect("/auth/login");
  const gimnasioId = perfilData.perfil.gimnasio_id;

  const nombre = trim(formData, "nombre");
  if (!nombre) return { error: "Ingresa un nombre para el plan." };

  const objetivo = trim(formData, "objetivo");
  const estado = trim(formData, "estado");
  if (!enLista(OBJETIVOS, objetivo)) return { error: "Selecciona un objetivo válido." };
  if (!enLista(ESTADOS_PLAN, estado)) return { error: "Selecciona un estado válido." };

  const calorias = numeroOpcional(trim(formData, "meta_calorias"));
  const proteina = numeroOpcional(trim(formData, "meta_proteina"));
  const carbohidratos = numeroOpcional(trim(formData, "meta_carbohidratos"));
  const grasas = numeroOpcional(trim(formData, "meta_grasas"));
  if ([calorias, proteina, carbohidratos, grasas].some((v) => v === undefined)) {
    return { error: "Las metas diarias deben ser números mayores o iguales a 0." };
  }

  const duracion = numeroOpcional(trim(formData, "duracion_dias"));
  if (duracion === undefined || duracion === 0 || (duracion !== null && !Number.isInteger(duracion))) {
    return { error: "La duración debe ser un número entero de días mayor que 0." };
  }

  const recetaIds = Array.from(new Set(formData.getAll("receta_id").map(String).filter(Boolean)));

  const supabase = await createClient();

  // Un plan con alumnos asignados no se puede archivar mientras la asignación siga activa
  // (se avisa en vez de dejar al alumno sin plan visible).
  if (id && estado === "archivado") {
    const { count } = await supabase
      .from("asignaciones_nutricionales")
      .select("id", { count: "exact", head: true })
      .eq("plan_id", id)
      .eq("estado", "activo");
    if (count) {
      return {
        error: `No se puede archivar: tiene ${count} alumno${count === 1 ? "" : "s"} con asignación activa.`,
      };
    }
  }

  const datos = {
    nombre,
    objetivo: objetivo as ObjetivoNutricional,
    estado: estado as EstadoPlanNutricional,
    descripcion: trim(formData, "descripcion") || null,
    instrucciones: trim(formData, "instrucciones") || null,
    meta_calorias: calorias,
    meta_proteina: proteina,
    meta_carbohidratos: carbohidratos,
    meta_grasas: grasas,
    duracion_dias: duracion,
  };

  let planId = id;
  if (id) {
    const { error } = await supabase
      .from("planes_nutricionales")
      .update(datos)
      .eq("id", id)
      .eq("gimnasio_id", gimnasioId);
    if (error) {
      if (error.code === UNIQUE_VIOLATION) return { error: "Ya existe un plan con ese nombre." };
      return { error: "No se pudo guardar el plan. Intenta de nuevo." };
    }
  } else {
    const { data, error } = await supabase
      .from("planes_nutricionales")
      .insert({ ...datos, gimnasio_id: gimnasioId, creado_por: perfilData.perfil.id })
      .select("id")
      .single();
    if (error || !data) {
      if (error?.code === UNIQUE_VIOLATION) return { error: "Ya existe un plan con ese nombre." };
      return { error: "No se pudo guardar el plan. Intenta de nuevo." };
    }
    planId = data.id as string;
  }

  const { error: delError } = await supabase
    .from("plan_nutricional_recetas")
    .delete()
    .eq("plan_id", planId!);
  if (delError) return { error: "No se pudieron guardar las recetas del plan." };

  if (recetaIds.length > 0) {
    const { error: insError } = await supabase.from("plan_nutricional_recetas").insert(
      recetaIds.map((receta_id) => ({ plan_id: planId!, receta_id, gimnasio_id: gimnasioId })),
    );
    if (insError) return { error: "No se pudieron guardar las recetas del plan." };
  }

  revalidatePath("/protected/nutricion/planes");
  revalidatePath("/protected/nutricion/asignar");
  redirect("/protected/nutricion/planes?guardado=1");
}

export async function archivarPlanNutricional(id: string): Promise<NutricionFormState> {
  const perfilData = await getPerfilActual();
  if (!perfilData) redirect("/auth/login");

  const supabase = await createClient();
  const { count } = await supabase
    .from("asignaciones_nutricionales")
    .select("id", { count: "exact", head: true })
    .eq("plan_id", id)
    .eq("estado", "activo");
  if (count) {
    return {
      error: `No se puede archivar: tiene ${count} alumno${count === 1 ? "" : "s"} con asignación activa.`,
    };
  }

  const { error } = await supabase
    .from("planes_nutricionales")
    .update({ estado: "archivado" })
    .eq("id", id)
    .eq("gimnasio_id", perfilData.perfil.gimnasio_id);
  if (error) return { error: "No se pudo archivar el plan. Intenta de nuevo." };

  revalidatePath("/protected/nutricion/planes");
  return {};
}

// ============================================================================
// Asignaciones
// ============================================================================

export async function crearAsignacion(
  _prev: NutricionFormState,
  formData: FormData,
): Promise<NutricionFormState> {
  const perfilData = await getPerfilActual();
  if (!perfilData) redirect("/auth/login");
  const gimnasioId = perfilData.perfil.gimnasio_id;

  const alumnoId = trim(formData, "alumno_id");
  if (!alumnoId) return { error: "Selecciona un alumno." };

  const planId = trim(formData, "plan_id") || null;
  const responsableId = trim(formData, "responsable_id") || perfilData.perfil.id;
  const estado = trim(formData, "estado") || "activo";
  if (!enLista(ESTADOS_ASIGNACION, estado)) return { error: "Selecciona un estado válido." };

  const fechaInicio = trim(formData, "fecha_inicio");
  if (!fechaInicio) return { error: "Indica la fecha de inicio." };
  const fechaFinInput = trim(formData, "fecha_fin") || null;
  if (fechaFinInput && fechaFinInput < fechaInicio) {
    return { error: "La fecha de término no puede ser anterior a la de inicio." };
  }

  const supabase = await createClient();

  const { data: alumno } = await supabase
    .from("alumnos")
    .select("id, plan_nutricional_habilitado")
    .eq("id", alumnoId)
    .eq("gimnasio_id", gimnasioId)
    .maybeSingle();
  if (!alumno) return { error: "No se encontró el alumno." };
  if (!alumno.plan_nutricional_habilitado) {
    return { error: "El alumno no tiene habilitado el plan nutricional en su membresía." };
  }

  let duracion: number | null = null;
  if (planId) {
    const { data: plan } = await supabase
      .from("planes_nutricionales")
      .select("estado, duracion_dias")
      .eq("id", planId)
      .eq("gimnasio_id", gimnasioId)
      .maybeSingle();
    if (!plan) return { error: "No se encontró el plan nutricional." };
    if (plan.estado === "archivado") return { error: "Un plan archivado no se puede asignar." };
    duracion = plan.duracion_dias as number | null;
  }

  const { error } = await supabase.from("asignaciones_nutricionales").insert({
    gimnasio_id: gimnasioId,
    alumno_id: alumnoId,
    plan_id: planId,
    responsable_id: responsableId,
    fecha_inicio: fechaInicio,
    fecha_fin: calcularFechaFin(fechaInicio, fechaFinInput, duracion),
    notas: trim(formData, "notas") || null,
    estado: estado as EstadoAsignacion,
  });

  if (error) {
    if (error.code === UNIQUE_VIOLATION) {
      return { error: "El alumno ya tiene una asignación activa. Pausa o cierra la actual primero." };
    }
    return { error: "No se pudo guardar la asignación. Intenta de nuevo." };
  }

  revalidatePath("/protected/nutricion/asignar");
  redirect("/protected/nutricion/asignar?asignado=1");
}

export async function cambiarEstadoAsignacion(
  id: string,
  estado: EstadoAsignacion,
): Promise<NutricionFormState> {
  const perfilData = await getPerfilActual();
  if (!perfilData) redirect("/auth/login");
  if (!enLista(ESTADOS_ASIGNACION, estado)) return { error: "Estado no válido." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("asignaciones_nutricionales")
    .update({ estado })
    .eq("id", id)
    .eq("gimnasio_id", perfilData.perfil.gimnasio_id);
  if (error) {
    if (error.code === UNIQUE_VIOLATION) {
      return { error: "El alumno ya tiene otra asignación activa." };
    }
    return { error: "No se pudo cambiar el estado. Intenta de nuevo." };
  }

  revalidatePath("/protected/nutricion/asignar");
  return {};
}
