"use client";

import { Plus, Trash2 } from "lucide-react";
import { useActionState, useMemo, useState } from "react";

import type { NutricionFormState } from "@/app/protected/nutricion/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  DIFICULTADES,
  TIPOS_RECETA,
  fmt1,
  macrosIngrediente,
  macrosPorPorcion,
  sumarMacros,
  type Alimento,
  type Ingrediente,
  type Receta,
} from "@/lib/nutricion";

type Fila = {
  key: number;
  alimento_id: string;
  nombre_manual: string;
  cantidad: string;
  unidad: "g" | "porcion";
};

type Props = {
  action: (state: NutricionFormState, formData: FormData) => Promise<NutricionFormState>;
  alimentos: Alimento[];
  receta?: Receta;
  ingredientes?: Ingrediente[];
  submitLabel: string;
};

export function RecetaForm({ action, alimentos, receta, ingredientes = [], submitLabel }: Props) {
  const [state, formAction, isPending] = useActionState(action, {});
  const [porciones, setPorciones] = useState(String(receta?.porciones ?? 1));
  const [filas, setFilas] = useState<Fila[]>(
    ingredientes.map((i, idx) => ({
      key: idx,
      alimento_id: i.alimento_id ?? "",
      nombre_manual: i.nombre_manual ?? "",
      cantidad: String(i.cantidad),
      unidad: i.unidad,
    })),
  );
  const [siguienteKey, setSiguienteKey] = useState(ingredientes.length);

  const porId = useMemo(() => new Map(alimentos.map((a) => [a.id, a])), [alimentos]);

  const macrosFila = (f: Fila) =>
    macrosIngrediente(
      { cantidad: Number(f.cantidad) || 0, unidad: f.unidad },
      f.alimento_id ? porId.get(f.alimento_id) : undefined,
    );
  const total = sumarMacros(filas.map(macrosFila));
  const porPorcion = macrosPorPorcion(total, Number(porciones) || 1);

  const actualizar = (key: number, cambio: Partial<Fila>) =>
    setFilas((fs) => fs.map((f) => (f.key === key ? { ...f, ...cambio } : f)));

  const serializados = JSON.stringify(
    filas.map((f) => ({
      alimento_id: f.alimento_id || null,
      nombre_manual: f.nombre_manual,
      cantidad: Number(f.cantidad),
      unidad: f.unidad,
    })),
  );

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <div className="grid gap-2 xl:col-span-2">
          <Label htmlFor="nombre">Nombre *</Label>
          <Input id="nombre" name="nombre" defaultValue={receta?.nombre} required autoFocus />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="tipo">Tipo</Label>
          <Select id="tipo" name="tipo" defaultValue={receta?.tipo ?? "almuerzo"}>
            {TIPOS_RECETA.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </Select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="dificultad">Dificultad</Label>
          <Select id="dificultad" name="dificultad" defaultValue={receta?.dificultad ?? "facil"}>
            {DIFICULTADES.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </Select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="porciones">Porciones</Label>
          <Input
            id="porciones"
            name="porciones"
            type="number"
            min="1"
            step="1"
            value={porciones}
            onChange={(e) => setPorciones(e.target.value)}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="tiempo_min">Tiempo (min)</Label>
          <Input
            id="tiempo_min"
            name="tiempo_min"
            type="number"
            min="0"
            step="1"
            defaultValue={receta?.tiempo_min ?? ""}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="estado">Estado</Label>
          <Select id="estado" name="estado" defaultValue={receta?.estado ?? "activo"}>
            <option value="activo">Activo</option>
            <option value="borrador">Borrador</option>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="url_video">Video de preparación (URL)</Label>
          <Input
            id="url_video"
            name="url_video"
            type="url"
            placeholder="https://"
            defaultValue={receta?.url_video ?? ""}
          />
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="descripcion">Descripción</Label>
          <Textarea id="descripcion" name="descripcion" defaultValue={receta?.descripcion ?? ""} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="preparacion">Modo de preparación</Label>
          <Textarea id="preparacion" name="preparacion" defaultValue={receta?.preparacion ?? ""} />
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base">Ingredientes</h3>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setFilas((fs) => [
                ...fs,
                { key: siguienteKey, alimento_id: "", nombre_manual: "", cantidad: "100", unidad: "g" },
              ]);
              setSiguienteKey((k) => k + 1);
            }}
          >
            <Plus className="h-4 w-4" />
            Agregar ingrediente
          </Button>
        </div>

        {filas.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aún no hay ingredientes.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {filas.map((f) => {
              const alimento = f.alimento_id ? porId.get(f.alimento_id) : undefined;
              const m = macrosFila(f);
              return (
                <div
                  key={f.key}
                  className="grid items-end gap-3 rounded-[9px] border border-border p-3 sm:grid-cols-[2fr_1fr_1fr_auto]"
                >
                  <div className="grid gap-1.5">
                    <Label>Alimento</Label>
                    <Select
                      value={f.alimento_id}
                      onChange={(e) =>
                        actualizar(f.key, {
                          alimento_id: e.target.value,
                          unidad: "g",
                        })
                      }
                    >
                      <option value="">Otro (texto manual)</option>
                      {alimentos.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.nombre}
                        </option>
                      ))}
                    </Select>
                    {!f.alimento_id && (
                      <Input
                        placeholder="Nombre del ingrediente"
                        value={f.nombre_manual}
                        onChange={(e) => actualizar(f.key, { nombre_manual: e.target.value })}
                      />
                    )}
                  </div>
                  <div className="grid gap-1.5">
                    <Label>Cantidad</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.1"
                      value={f.cantidad}
                      onChange={(e) => actualizar(f.key, { cantidad: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label>Unidad</Label>
                    <Select
                      value={f.unidad}
                      disabled={!alimento}
                      onChange={(e) => actualizar(f.key, { unidad: e.target.value as "g" | "porcion" })}
                    >
                      <option value="g">g / ml</option>
                      {alimento?.unidad_porcion && alimento.gramos_porcion && (
                        <option value="porcion">
                          {alimento.unidad_porcion} ({fmt1(Number(alimento.gramos_porcion))} g)
                        </option>
                      )}
                    </Select>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Quitar ingrediente"
                    onClick={() => setFilas((fs) => fs.filter((x) => x.key !== f.key))}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  {alimento && (
                    <p className="text-xs text-muted-foreground sm:col-span-4">
                      {fmt1(m.calorias)} kcal · P {fmt1(m.proteina)} g · C {fmt1(m.carbohidratos)} g · G{" "}
                      {fmt1(m.grasas)} g
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="grid gap-1 rounded-[9px] bg-secondary/60 px-4 py-3 text-sm">
          <div className="flex flex-wrap gap-x-6 gap-y-1">
            <span className="font-medium">TOTAL</span>
            <span>{fmt1(total.calorias)} kcal</span>
            <span>P {fmt1(total.proteina)} g</span>
            <span>C {fmt1(total.carbohidratos)} g</span>
            <span>G {fmt1(total.grasas)} g</span>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-muted-foreground">
            <span>Por porción</span>
            <span>{fmt1(porPorcion.calorias)} kcal</span>
            <span>P {fmt1(porPorcion.proteina)} g</span>
            <span>C {fmt1(porPorcion.carbohidratos)} g</span>
            <span>G {fmt1(porPorcion.grasas)} g</span>
          </div>
        </div>
        <input type="hidden" name="ingredientes" value={serializados} />
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
