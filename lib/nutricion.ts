// Spec 24: tipos, etiquetas y cálculo de macros del módulo Nutrición.
// Alineado con `supabase/migrations/0022_nutricion.sql`.

export type CategoriaAlimento =
  | "proteina" | "carbohidrato" | "grasa" | "fruta" | "verdura" | "lacteo"
  | "legumbre" | "cereal" | "suplemento" | "condimento" | "bebida" | "otro";
export type TipoReceta = "desayuno" | "colacion" | "almuerzo" | "cena" | "snack";
export type DificultadReceta = "facil" | "media" | "dificil";
export type EstadoReceta = "activo" | "borrador";
export type ObjetivoNutricional =
  | "deficit_calorico" | "mantenimiento" | "volumen" | "salud_general" | "deportivo";
export type EstadoPlanNutricional = "activo" | "borrador" | "archivado";
export type EstadoAsignacion = "activo" | "pausado" | "completado" | "cancelado";

export interface Alimento {
  id: string;
  gimnasio_id: string | null;
  nombre: string;
  categoria: CategoriaAlimento;
  calorias: number;
  proteina: number;
  carbohidratos: number;
  grasas: number;
  unidad_porcion: string | null;
  gramos_porcion: number | null;
}

export interface Receta {
  id: string;
  gimnasio_id: string;
  nombre: string;
  tipo: TipoReceta;
  dificultad: DificultadReceta;
  porciones: number;
  tiempo_min: number | null;
  descripcion: string | null;
  preparacion: string | null;
  estado: EstadoReceta;
  url_video: string | null;
  foto_path: string | null;
}

export interface Ingrediente {
  id: string;
  receta_id: string;
  alimento_id: string | null;
  nombre_manual: string | null;
  cantidad: number;
  unidad: "g" | "porcion";
  orden: number;
}

export interface PlanNutricional {
  id: string;
  gimnasio_id: string;
  nombre: string;
  objetivo: ObjetivoNutricional;
  estado: EstadoPlanNutricional;
  descripcion: string | null;
  instrucciones: string | null;
  meta_calorias: number | null;
  meta_proteina: number | null;
  meta_carbohidratos: number | null;
  meta_grasas: number | null;
  duracion_dias: number | null;
}

export interface Asignacion {
  id: string;
  gimnasio_id: string;
  alumno_id: string;
  plan_id: string | null;
  responsable_id: string | null;
  fecha_inicio: string;
  fecha_fin: string | null;
  notas: string | null;
  estado: EstadoAsignacion;
}

export const CATEGORIAS_ALIMENTO: { value: CategoriaAlimento; label: string }[] = [
  { value: "proteina", label: "Proteína" },
  { value: "carbohidrato", label: "Carbohidrato" },
  { value: "grasa", label: "Grasa" },
  { value: "fruta", label: "Fruta" },
  { value: "verdura", label: "Verdura" },
  { value: "lacteo", label: "Lácteo" },
  { value: "legumbre", label: "Legumbre" },
  { value: "cereal", label: "Cereal" },
  { value: "suplemento", label: "Suplemento" },
  { value: "condimento", label: "Condimento" },
  { value: "bebida", label: "Bebida" },
  { value: "otro", label: "Otro" },
];

export const TIPOS_RECETA: { value: TipoReceta; label: string }[] = [
  { value: "desayuno", label: "Desayuno" },
  { value: "colacion", label: "Colación" },
  { value: "almuerzo", label: "Almuerzo" },
  { value: "cena", label: "Cena" },
  { value: "snack", label: "Snack" },
];

export const DIFICULTADES: { value: DificultadReceta; label: string }[] = [
  { value: "facil", label: "Fácil" },
  { value: "media", label: "Media" },
  { value: "dificil", label: "Difícil" },
];

export const OBJETIVOS: { value: ObjetivoNutricional; label: string }[] = [
  { value: "deficit_calorico", label: "Déficit calórico" },
  { value: "mantenimiento", label: "Mantenimiento" },
  { value: "volumen", label: "Volumen" },
  { value: "salud_general", label: "Salud general" },
  { value: "deportivo", label: "Deportivo" },
];

export const ESTADOS_PLAN: { value: EstadoPlanNutricional; label: string }[] = [
  { value: "activo", label: "Activo" },
  { value: "borrador", label: "Borrador" },
  { value: "archivado", label: "Archivado" },
];

export const ESTADOS_ASIGNACION: { value: EstadoAsignacion; label: string }[] = [
  { value: "activo", label: "Activo" },
  { value: "pausado", label: "Pausado" },
  { value: "completado", label: "Completado" },
  { value: "cancelado", label: "Cancelado" },
];

function etiqueta<T extends string>(lista: { value: T; label: string }[]) {
  const mapa = Object.fromEntries(lista.map((i) => [i.value, i.label])) as Record<T, string>;
  return (v: T) => mapa[v] ?? v;
}

export const labelCategoria = etiqueta(CATEGORIAS_ALIMENTO);
export const labelTipoReceta = etiqueta(TIPOS_RECETA);
export const labelDificultad = etiqueta(DIFICULTADES);
export const labelObjetivo = etiqueta(OBJETIVOS);
export const labelEstadoPlan = etiqueta(ESTADOS_PLAN);
export const labelEstadoAsignacion = etiqueta(ESTADOS_ASIGNACION);

export type Macros = { calorias: number; proteina: number; carbohidratos: number; grasas: number };

export const MACROS_CERO: Macros = { calorias: 0, proteina: 0, carbohidratos: 0, grasas: 0 };

/** Gramos que aporta un ingrediente: 'g' es directo; 'porcion' usa los gramos por
 * porción del alimento (0 si el alimento no la define). */
export function gramosIngrediente(
  ing: Pick<Ingrediente, "cantidad" | "unidad">,
  alimento: Pick<Alimento, "gramos_porcion"> | undefined,
): number {
  if (ing.unidad === "g") return Number(ing.cantidad);
  return Number(ing.cantidad) * Number(alimento?.gramos_porcion ?? 0);
}

/** Macros de un ingrediente (valores del alimento por 100 g). Sin alimento (texto
 * manual) no aporta. */
export function macrosIngrediente(
  ing: Pick<Ingrediente, "cantidad" | "unidad">,
  alimento: Alimento | undefined,
): Macros {
  if (!alimento) return MACROS_CERO;
  const f = gramosIngrediente(ing, alimento) / 100;
  return {
    calorias: Number(alimento.calorias) * f,
    proteina: Number(alimento.proteina) * f,
    carbohidratos: Number(alimento.carbohidratos) * f,
    grasas: Number(alimento.grasas) * f,
  };
}

export function sumarMacros(lista: Macros[]): Macros {
  return lista.reduce(
    (t, m) => ({
      calorias: t.calorias + m.calorias,
      proteina: t.proteina + m.proteina,
      carbohidratos: t.carbohidratos + m.carbohidratos,
      grasas: t.grasas + m.grasas,
    }),
    MACROS_CERO,
  );
}

export function macrosPorPorcion(total: Macros, porciones: number): Macros {
  const n = porciones > 0 ? porciones : 1;
  return {
    calorias: total.calorias / n,
    proteina: total.proteina / n,
    carbohidratos: total.carbohidratos / n,
    grasas: total.grasas / n,
  };
}

/** Totales de una receta a partir de sus ingredientes y el catálogo de alimentos. */
export function macrosReceta(
  ingredientes: Pick<Ingrediente, "alimento_id" | "cantidad" | "unidad">[],
  alimentos: Map<string, Alimento>,
): Macros {
  return sumarMacros(
    ingredientes.map((i) =>
      macrosIngrediente(i, i.alimento_id ? alimentos.get(i.alimento_id) : undefined),
    ),
  );
}

export function fmt1(n: number): string {
  return (Math.round(n * 10) / 10).toLocaleString("es-CL", { maximumFractionDigits: 1 });
}

/** Fecha de término: la indicada, o inicio + duración del plan, o null. */
export function calcularFechaFin(
  inicio: string,
  fin: string | null,
  duracionDias: number | null,
): string | null {
  if (fin) return fin;
  if (!duracionDias) return null;
  const d = new Date(`${inicio}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + duracionDias);
  return d.toISOString().slice(0, 10);
}

export function esUrlHttp(valor: string): boolean {
  try {
    const u = new URL(valor);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}
