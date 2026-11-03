import { PlayCircle } from "lucide-react";
import { redirect } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatFecha } from "@/lib/format";
import { getAlumnoActual } from "@/lib/alumno-portal";
import {
  fmt1,
  labelDificultad,
  labelObjetivo,
  labelTipoReceta,
  macrosIngrediente,
  macrosPorPorcion,
  sumarMacros,
  type Alimento,
  type Asignacion,
  type Ingrediente,
  type PlanNutricional,
  type Receta,
} from "@/lib/nutricion";
import { urlsFotosRecetas } from "@/lib/nutricion-server";
import { createClient } from "@/lib/supabase/server";

// Contenido dinámico por usuario (sesión y datos del gimnasio); mismo criterio que el layout.
export const instant = false;

/** Spec 24, §8: "Mi plan nutricional", solo lectura. RLS limita la lectura a la
 * asignación activa del propio alumno y a lo que esa asignación contiene. */
/** Spec 60: label pastel por comida del día. */
const COLOR_COMIDA: Record<string, string> = {
  desayuno: "bg-amber-100 text-amber-800",
  colacion: "bg-lime-100 text-lime-800",
  almuerzo: "bg-orange-100 text-orange-800",
  cena: "bg-indigo-100 text-indigo-800",
  snack: "bg-pink-100 text-pink-800",
};

export default async function PortalNutricionPage() {
  const alumno = await getAlumnoActual();
  if (!alumno) return null; // el layout ya redirige a /auth/login
  if (!alumno.plan_nutricional_habilitado) redirect("/portal");

  const supabase = await createClient();
  const { data: asignacionData } = await supabase
    .from("asignaciones_nutricionales")
    .select("*")
    .eq("alumno_id", alumno.id)
    .eq("estado", "activo")
    .maybeSingle();
  const asignacion = asignacionData as Asignacion | null;

  const cabecera = (
    <div>
      <div className="mb-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">Portal del alumno</div>
      <h2 className="text-2xl">Nutrición</h2>
    </div>
  );

  if (!asignacion || !asignacion.plan_id) {
    return (
      <div className="flex flex-col gap-6">
        {cabecera}
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Todavía no tienes un plan nutricional activo.
          </CardContent>
        </Card>
      </div>
    );
  }

  const [{ data: planData }, { data: vinculos }, { data: ingredientes }, { data: alimentos }] =
    await Promise.all([
      supabase.from("planes_nutricionales").select("*").eq("id", asignacion.plan_id).maybeSingle(),
      supabase.from("plan_nutricional_recetas").select("receta_id, orden").eq("plan_id", asignacion.plan_id).order("orden"),
      supabase.from("receta_ingredientes").select("*").order("orden"),
      supabase.from("alimentos").select("*"),
    ]);
  const plan = planData as PlanNutricional | null;
  const recetaIds = (vinculos ?? []).map((v) => v.receta_id as string);
  const { data: recetasData } = recetaIds.length
    ? await supabase.from("recetas").select("*").in("id", recetaIds).order("nombre")
    : { data: [] };
  // Spec 60/63: las recetas siguen el orden que el dueño definió en el plan.
  const ordenPorReceta = new Map((vinculos ?? []).map((v) => [v.receta_id as string, Number(v.orden ?? 0)]));
  const recetas = ((recetasData ?? []) as Receta[]).sort(
    (a, b) =>
      (ordenPorReceta.get(a.id) ?? 0) - (ordenPorReceta.get(b.id) ?? 0) ||
      a.nombre.localeCompare(b.nombre, "es"),
  );
  const fotos = await urlsFotosRecetas(recetas.map((r) => r.foto_path));

  const alimentoPorId = new Map(((alimentos ?? []) as Alimento[]).map((a) => [a.id, a]));
  const ingPorReceta = new Map<string, Ingrediente[]>();
  for (const i of (ingredientes ?? []) as Ingrediente[]) {
    ingPorReceta.set(i.receta_id, [...(ingPorReceta.get(i.receta_id) ?? []), i]);
  }

  if (!plan) {
    return (
      <div className="flex flex-col gap-6">
        {cabecera}
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Todavía no tienes un plan nutricional activo.
          </CardContent>
        </Card>
      </div>
    );
  }

  // Spec 56: un color por macro (fondo suave, borde y valor del mismo tono).
  const metas = [
    ["Calorías", plan.meta_calorias, "kcal", "border-orange-300 bg-orange-50 text-orange-700"],
    ["Proteína", plan.meta_proteina, "g", "border-rose-300 bg-rose-50 text-rose-700"],
    ["Carbohidratos", plan.meta_carbohidratos, "g", "border-amber-300 bg-amber-50 text-amber-700"],
    ["Grasas", plan.meta_grasas, "g", "border-sky-300 bg-sky-50 text-sky-700"],
  ] as const;

  return (
    <div className="flex flex-col gap-6">
      {cabecera}

      <Card>
        <CardContent className="flex flex-col gap-4 pt-6">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="text-xl">{plan.nombre}</h3>
            <Badge>{labelObjetivo(plan.objetivo)}</Badge>
          </div>
          <p className="text-[15px] text-muted-foreground">
            Desde {formatFecha(asignacion.fecha_inicio)}
            {asignacion.fecha_fin && ` hasta ${formatFecha(asignacion.fecha_fin)}`}
          </p>
          {plan.descripcion && <p className="text-[15px]">{plan.descripcion}</p>}
          {metas.some(([, v]) => v !== null) && (
            <div className="grid gap-3 sm:grid-cols-4">
              {metas.map(([label, valor, unidad, color]) => (
                <div key={label} className={`rounded-[9px] border px-4 py-3 ${color}`}>
                  <div className="text-[13px] font-medium uppercase tracking-wide">{label}</div>
                  <div className="font-display text-[1.375rem]">
                    {valor !== null ? `${fmt1(Number(valor))} ${unidad}` : "—"}
                  </div>
                </div>
              ))}
            </div>
          )}
          {plan.instrucciones && (
            <div>
              <h4 className="mb-1 text-[15px] font-semibold">Instrucciones generales</h4>
              <p className="whitespace-pre-line text-[15px] text-muted-foreground">{plan.instrucciones}</p>
            </div>
          )}
          {asignacion.notas && (
            <div>
              <h4 className="mb-1 text-[15px] font-semibold">Notas para ti</h4>
              <p className="whitespace-pre-line text-[15px] text-muted-foreground">{asignacion.notas}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {recetas.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Tu plan todavía no tiene recetas.
          </CardContent>
        </Card>
      ) : (
        recetas.map((r) => {
          const ings = ingPorReceta.get(r.id) ?? [];
          const total = sumarMacros(
            ings.map((i) => macrosIngrediente(i, i.alimento_id ? alimentoPorId.get(i.alimento_id) : undefined)),
          );
          const porcion = macrosPorPorcion(total, r.porciones);
          return (
            <Card key={r.id}>
              <CardContent className="grid gap-4 pt-6 md:grid-cols-[1fr_minmax(0,18rem)] lg:grid-cols-[1fr_minmax(0,22rem)]">
               {/* Spec 60: texto a la izquierda, foto a la derecha (en móvil la foto va primero). */}
               <div className="order-2 flex min-w-0 flex-col gap-3 md:order-1">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <span
                      className={`mb-1.5 inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${COLOR_COMIDA[r.tipo] ?? "bg-secondary text-secondary-foreground"}`}
                    >
                      {labelTipoReceta(r.tipo)}
                    </span>
                    <h3 className="text-lg">{r.nombre}</h3>
                    <p className="text-[13px] text-muted-foreground">
                      {labelDificultad(r.dificultad)} · {r.porciones}{" "}
                      {r.porciones === 1 ? "porción" : "porciones"}
                      {r.tiempo_min ? ` · ${r.tiempo_min} min` : ""}
                    </p>
                  </div>
                  {r.url_video && (
                    <a
                      href={r.url_video}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-1.5 text-sm hover:border-primary hover:text-primary"
                    >
                      <PlayCircle className="h-4 w-4" />
                      Ver video
                    </a>
                  )}
                </div>
                {r.descripcion && <p className="text-[15px]">{r.descripcion}</p>}
                {ings.length > 0 && (
                  <ul className="list-disc pl-5 text-[15px]">
                    {ings.map((i) => {
                      const al = i.alimento_id ? alimentoPorId.get(i.alimento_id) : undefined;
                      const nombre = al?.nombre ?? i.nombre_manual ?? "Ingrediente";
                      const cantidad =
                        i.unidad === "porcion" && al?.unidad_porcion
                          ? `${fmt1(Number(i.cantidad))} ${al.unidad_porcion}`
                          : `${fmt1(Number(i.cantidad))} g`;
                      return (
                        <li key={i.id}>
                          {nombre} — {cantidad}
                        </li>
                      );
                    })}
                  </ul>
                )}
                {ings.length > 0 && (
                  <p className="text-[13px] text-muted-foreground">
                    Por porción: {fmt1(porcion.calorias)} kcal · P {fmt1(porcion.proteina)} g · C{" "}
                    {fmt1(porcion.carbohidratos)} g · G {fmt1(porcion.grasas)} g
                  </p>
                )}
                {r.preparacion && (
                  <div>
                    <h4 className="mb-1 text-[15px] font-semibold">Preparación</h4>
                    <p className="whitespace-pre-line text-[15px] text-muted-foreground">{r.preparacion}</p>
                  </div>
                )}
               </div>
               {r.foto_path && fotos.get(r.foto_path) && (
                 <div className="order-1 md:order-2">
                  {/* eslint-disable-next-line @next/next/no-img-element -- foto firmada de Storage, ya comprimida */}
                  <img
                    src={fotos.get(r.foto_path)}
                    alt={`Foto de ${r.nombre}`}
                    loading="lazy"
                    className="aspect-[4/3] w-full rounded-[9px] border border-border object-cover"
                  />
                 </div>
               )}
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}
