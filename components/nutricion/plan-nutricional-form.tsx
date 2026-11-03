"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import type { NutricionFormState } from "@/app/protected/nutricion/actions";
import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { IconAction } from "@/components/ui/icon-action";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  // Recetas del plan en el orden en que se mostrarán (spec 63); `seleccion` ya viene ordenada.
  const [orden, setOrden] = useState<string[]>(seleccion);
  const [busqueda, setBusqueda] = useState("");
  const [porAgregar, setPorAgregar] = useState("");
  const elegidas = new Set(orden);
  const [metas, setMetas] = useState<Record<string, string>>({
    meta_calorias: String(plan?.meta_calorias ?? ""),
    meta_proteina: String(plan?.meta_proteina ?? ""),
    meta_carbohidratos: String(plan?.meta_carbohidratos ?? ""),
    meta_grasas: String(plan?.meta_grasas ?? ""),
  });

  // Aporte de las recetas elegidas (una porción de cada una).
  const aporte = sumarMacros(recetas.filter((r) => elegidas.has(r.id)).map((r) => r.porPorcion));

  const recetaPorId = new Map(recetas.map((r) => [r.id, r]));
  const disponibles = recetas.filter(
    (r) =>
      !elegidas.has(r.id) &&
      r.nombre.toLocaleLowerCase("es").includes(busqueda.trim().toLocaleLowerCase("es")),
  );
  const agregar = () => {
    if (!porAgregar || elegidas.has(porAgregar)) return;
    setOrden((o) => [...o, porAgregar]);
    setPorAgregar("");
  };
  const quitar = (id: string) => setOrden((o) => o.filter((x) => x !== id));
  const mover = (id: string, posicion: number) =>
    setOrden((o) => {
      const sin = o.filter((x) => x !== id);
      sin.splice(posicion, 0, id);
      return sin;
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
          <>
            <div className="flex flex-wrap items-end gap-3">
              <div className="grid min-w-[12rem] flex-1 gap-1.5 sm:max-w-xs">
                <Label htmlFor="busqueda_receta">Buscar receta</Label>
                <Input
                  id="busqueda_receta"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Escribe para filtrar…"
                />
              </div>
              <div className="grid min-w-[14rem] flex-1 gap-1.5 sm:max-w-sm">
                <Label htmlFor="receta_por_agregar">Receta</Label>
                <Select
                  id="receta_por_agregar"
                  value={porAgregar}
                  onChange={(e) => setPorAgregar(e.target.value)}
                >
                  <option value="">
                    {disponibles.length === 0 ? "Sin recetas disponibles" : "Selecciona una receta"}
                  </option>
                  {disponibles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.nombre} · {labelTipoReceta(r.tipo)}
                    </option>
                  ))}
                </Select>
              </div>
              <Button type="button" variant="outline" onClick={agregar} disabled={!porAgregar}>
                Agregar
              </Button>
            </div>

            {orden.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                Aún no hay recetas en el plan.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-28">Orden</TableHead>
                    <TableHead>Receta</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Calorías por porción</TableHead>
                    <TableHead className="w-px text-right">Quitar</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orden.map((id, i) => {
                    const r = recetaPorId.get(id);
                    if (!r) return null;
                    return (
                      <TableRow key={id}>
                        <TableCell>
                          <input type="hidden" name="receta_id" value={id} />
                          <Select
                            aria-label={`Orden de ${r.nombre}`}
                            value={i}
                            onChange={(e) => mover(id, Number(e.target.value))}
                            className="h-9 w-24"
                          >
                            {orden.map((_, pos) => (
                              <option key={pos} value={pos}>
                                {pos + 1}º
                              </option>
                            ))}
                          </Select>
                        </TableCell>
                        <TableCell className="font-medium text-foreground">{r.nombre}</TableCell>
                        <TableCell>{labelTipoReceta(r.tipo)}</TableCell>
                        <TableCell>{fmt1(r.porPorcion.calorias)} kcal</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end">
                            <IconAction
                              icon={Trash2}
                              label="Quitar del plan"
                              tooltipDerecha
                              onClick={() => quitar(id)}
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </>
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
