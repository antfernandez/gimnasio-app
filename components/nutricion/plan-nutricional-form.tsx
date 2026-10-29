"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import type { NutricionFormState } from "@/app/protected/nutricion/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  ESTADOS_PLAN,
  OBJETIVOS,
  fmt1,
  labelTipoReceta,
  sumarMacros,
  type Macros,
  type PlanNutricional,
  type Receta,
} from "@/lib/nutricion";

export type RecetaConMacros = Receta & { porPorcion: Macros };

type Props = {
  action: (state: NutricionFormState, formData: FormData) => Promise<NutricionFormState>;
  recetas: RecetaConMacros[];
  plan?: PlanNutricional;
  seleccion?: string[];
  submitLabel: string;
};

const METAS = [
  ["meta_calorias", "Calorías (kcal)", "calorias"],
  ["meta_proteina", "Proteína (g)", "proteina"],
  ["meta_carbohidratos", "Carbohidratos (g)", "carbohidratos"],
  ["meta_grasas", "Grasas (g)", "grasas"],
] as const;

export function PlanNutricionalForm({ action, recetas, plan, seleccion = [], submitLabel }: Props) {
  const [state, formAction, isPending] = useActionState(action, {});
  const [elegidas, setElegidas] = useState<Set<string>>(new Set(seleccion));
  const [metas, setMetas] = useState<Record<string, string>>({
    meta_calorias: String(plan?.meta_calorias ?? ""),
    meta_proteina: String(plan?.meta_proteina ?? ""),
    meta_carbohidratos: String(plan?.meta_carbohidratos ?? ""),
    meta_grasas: String(plan?.meta_grasas ?? ""),
  });

  // Aporte de las recetas elegidas (una porción de cada una).
  const aporte = sumarMacros(recetas.filter((r) => elegidas.has(r.id)).map((r) => r.porPorcion));

  const alternar = (id: string) =>
    setElegidas((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <div className="grid gap-2 xl:col-span-2">
          <Label htmlFor="nombre">Nombre *</Label>
          <Input id="nombre" name="nombre" defaultValue={plan?.nombre} required autoFocus />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="objetivo">Objetivo</Label>
          <Select id="objetivo" name="objetivo" defaultValue={plan?.objetivo ?? "salud_general"}>
            {OBJETIVOS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="estado">Estado</Label>
          <Select id="estado" name="estado" defaultValue={plan?.estado ?? "borrador"}>
            {ESTADOS_PLAN.map((e) => (
              <option key={e.value} value={e.value}>
                {e.label}
              </option>
            ))}
          </Select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="duracion_dias">Duración (días)</Label>
          <Input
            id="duracion_dias"
            name="duracion_dias"
            type="number"
            min="1"
            step="1"
            defaultValue={plan?.duracion_dias ?? ""}
          />
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="descripcion">Descripción</Label>
          <Textarea id="descripcion" name="descripcion" defaultValue={plan?.descripcion ?? ""} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="instrucciones">Instrucciones generales</Label>
          <Textarea id="instrucciones" name="instrucciones" defaultValue={plan?.instrucciones ?? ""} />
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-base">Metas diarias</h3>
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {METAS.map(([name, label, clave]) => {
            const meta = Number(metas[name]);
            return (
              <div key={name} className="grid gap-2">
                <Label htmlFor={name}>{label}</Label>
                <Input
                  id={name}
                  name={name}
                  type="number"
                  min="0"
                  step="0.1"
                  value={metas[name]}
                  onChange={(e) => setMetas((m) => ({ ...m, [name]: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">
                  Recetas elegidas: {fmt1(aporte[clave])}
                  {meta > 0 && ` (${Math.round((aporte[clave] / meta) * 100)} % de la meta)`}
                </p>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground">
          El aporte suma una porción de cada receta elegida.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-base">Recetas del plan</h3>
        {recetas.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No hay recetas activas.{" "}
            <Link href="/protected/nutricion/recetas/nueva" className="text-primary hover:underline">
              Crea una primero
            </Link>
            .
          </p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {recetas.map((r) => (
              <label
                key={r.id}
                className="flex cursor-pointer items-start gap-3 rounded-[9px] border border-border p-3 text-sm hover:border-primary"
              >
                <input
                  type="checkbox"
                  name="receta_id"
                  value={r.id}
                  checked={elegidas.has(r.id)}
                  onChange={() => alternar(r.id)}
                  className="mt-0.5 h-4 w-4 accent-[hsl(var(--primary))]"
                />
                <span>
                  <span className="font-medium text-foreground">{r.nombre}</span>
                  <span className="block text-xs text-muted-foreground">
                    {labelTipoReceta(r.tipo)} · {fmt1(r.porPorcion.calorias)} kcal por porción
                  </span>
                </span>
              </label>
            ))}
          </div>
        )}
      </div>

      {state.error && <p className="text-sm text-destructive">{state.error}</p>}

      <div className="flex gap-3">
        <Button type="submit" size="lg" disabled={isPending}>
          {isPending ? "Guardando…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
