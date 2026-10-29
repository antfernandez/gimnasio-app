import { PlayCircle } from "lucide-react";

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
import { createClient } from "@/lib/supabase/server";

/** Spec 24, §8: "Mi plan nutricional", solo lectura. RLS limita la lectura a la
 * asignación activa del propio alumno y a lo que esa asignación contiene. */
export default async function PortalNutricionPage() {
  const alumno = await getAlumnoActual();
  if (!alumno) return null; // el layout ya redirige a /auth/login

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
      <h2 className="text-2xl">Mi plan nutricional</h2>
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
      supabase.from("plan_nutricional_recetas").select("receta_id").eq("plan_id", asignacion.plan_id),
      supabase.from("receta_ingredientes").select("*").order("orden"),
      supabase.from("alimentos").select("*"),
    ]);
  const plan = planData as PlanNutricional | null;
  const recetaIds = (vinculos ?? []).map((v) => v.receta_id as string);
  const { data: recetasData } = recetaIds.length
    ? await supabase.from("recetas").select("*").in("id", recetaIds).order("nombre")
    : { data: [] };
  const recetas = (recetasData ?? []) as Receta[];

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

  const metas = [
    ["Calorías", plan.meta_calorias, "kcal"],
    ["Proteína", plan.meta_proteina, "g"],
    ["Carbohidratos", plan.meta_carbohidratos, "g"],
    ["Grasas", plan.meta_grasas, "g"],
  ] as const;

  return (
    <div className="flex flex-col gap-6">
      {cabecera}

      <Card>
        <CardContent className="flex flex-col gap-4 pt-6">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="text-lg">{plan.nombre}</h3>
            <Badge>{labelObjetivo(plan.objetivo)}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Desde {formatFecha(asignacion.fecha_inicio)}
            {asignacion.fecha_fin && ` hasta ${formatFecha(asignacion.fecha_fin)}`}
          </p>
          {plan.descripcion && <p className="text-sm">{plan.descripcion}</p>}
          {metas.some(([, v]) => v !== null) && (
            <div className="grid gap-3 sm:grid-cols-4">
              {metas.map(([label, valor, unidad]) => (
                <div key={label} className="rounded-[9px] border border-border px-4 py-3">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
                  <div className="font-display text-xl">
                    {valor !== null ? `${fmt1(Number(valor))} ${unidad}` : "—"}
                  </div>
                </div>
              ))}
            </div>
          )}
          {plan.instrucciones && (
            <div>
              <h4 className="mb-1 text-sm font-semibold">Instrucciones generales</h4>
              <p className="whitespace-pre-line text-sm text-muted-foreground">{plan.instrucciones}</p>
            </div>
          )}
          {asignacion.notas && (
            <div>
              <h4 className="mb-1 text-sm font-semibold">Notas para ti</h4>
              <p className="whitespace-pre-line text-sm text-muted-foreground">{asignacion.notas}</p>
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
              <CardContent className="flex flex-col gap-3 pt-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base">{r.nombre}</h3>
                    <p className="text-xs text-muted-foreground">
                      {labelTipoReceta(r.tipo)} · {labelDificultad(r.dificultad)} · {r.porciones}{" "}
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
                {r.descripcion && <p className="text-sm">{r.descripcion}</p>}
                {ings.length > 0 && (
                  <ul className="list-disc pl-5 text-sm">
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
                  <p className="text-xs text-muted-foreground">
                    Por porción: {fmt1(porcion.calorias)} kcal · P {fmt1(porcion.proteina)} g · C{" "}
                    {fmt1(porcion.carbohidratos)} g · G {fmt1(porcion.grasas)} g
                  </p>
                )}
                {r.preparacion && (
                  <div>
                    <h4 className="mb-1 text-sm font-semibold">Preparación</h4>
                    <p className="whitespace-pre-line text-sm text-muted-foreground">{r.preparacion}</p>
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
