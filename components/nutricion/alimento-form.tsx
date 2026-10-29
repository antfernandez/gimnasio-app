"use client";

import { useActionState } from "react";

import type { NutricionFormState } from "@/app/protected/nutricion/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { CATEGORIAS_ALIMENTO, type Alimento } from "@/lib/nutricion";

type Props = {
  action: (state: NutricionFormState, formData: FormData) => Promise<NutricionFormState>;
  alimento?: Alimento;
  submitLabel: string;
};

export function AlimentoForm({ action, alimento, submitLabel }: Props) {
  const [state, formAction, isPending] = useActionState(action, {});

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <div className="grid gap-2 xl:col-span-2">
          <Label htmlFor="nombre">Nombre *</Label>
          <Input id="nombre" name="nombre" defaultValue={alimento?.nombre} required />
        </div>
        <div className="grid gap-2 xl:col-span-2">
          <Label htmlFor="categoria">Categoría *</Label>
          <Select id="categoria" name="categoria" defaultValue={alimento?.categoria ?? "proteina"} required>
            {CATEGORIAS_ALIMENTO.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </Select>
        </div>
        {(
          [
            ["calorias", "Calorías (kcal / 100 g)", alimento?.calorias],
            ["proteina", "Proteína (g / 100 g)", alimento?.proteina],
            ["carbohidratos", "Carbohidratos (g / 100 g)", alimento?.carbohidratos],
            ["grasas", "Grasas (g / 100 g)", alimento?.grasas],
          ] as const
        ).map(([name, label, valor]) => (
          <div key={name} className="grid gap-2">
            <Label htmlFor={name}>{label}</Label>
            <Input id={name} name={name} type="number" min="0" step="0.1" defaultValue={valor ?? 0} />
          </div>
        ))}
        <div className="grid gap-2">
          <Label htmlFor="unidad_porcion">Unidad de porción</Label>
          <Input
            id="unidad_porcion"
            name="unidad_porcion"
            placeholder="Ej. scoop"
            defaultValue={alimento?.unidad_porcion ?? ""}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="gramos_porcion">Gramos por porción</Label>
          <Input
            id="gramos_porcion"
            name="gramos_porcion"
            type="number"
            min="0"
            step="0.1"
            placeholder="30"
            defaultValue={alimento?.gramos_porcion ?? ""}
          />
        </div>
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
