"use client";

import { useActionState } from "react";

import type { EjercicioFormState } from "@/app/protected/ejercicios/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { Ejercicio, ZonaCuerpo } from "@/lib/types";

type Props = {
  action: (
    state: EjercicioFormState,
    formData: FormData,
  ) => Promise<EjercicioFormState>;
  zonas: ZonaCuerpo[];
  ejercicio?: Ejercicio;
  zonaInicial?: string;
  submitLabel: string;
};

function Campo({
  id,
  label,
  error,
  className,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`grid gap-2 ${className ?? ""}`}>
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

export function EjercicioForm({
  action,
  zonas,
  ejercicio,
  zonaInicial,
  submitLabel,
}: Props) {
  const [state, formAction, isPending] = useActionState(action, {});
  const e = state.errores ?? {};

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        <Campo id="nombre" label="Nombre *" error={e.nombre}>
          <Input
            id="nombre"
            name="nombre"
            placeholder="Ej. Press de banca con barra"
            defaultValue={ejercicio?.nombre}
            required
            autoFocus
          />
        </Campo>
        <Campo id="zona_id" label="Zona del cuerpo *" error={e.zona_id}>
          <Select
            id="zona_id"
            name="zona_id"
            defaultValue={ejercicio?.zona_id ?? zonaInicial ?? ""}
            required
          >
            <option value="" disabled>
              Elige una zona
            </option>
            {zonas.map((z) => (
              <option key={z.id} value={z.id}>
                {z.nombre}
              </option>
            ))}
          </Select>
        </Campo>
        <Campo id="subgrupo" label="Subgrupo">
          <Input
            id="subgrupo"
            name="subgrupo"
            placeholder="Ej. Remos, Jalones"
            defaultValue={ejercicio?.subgrupo ?? ""}
          />
        </Campo>
        <Campo id="equipo" label="Equipo">
          <Input
            id="equipo"
            name="equipo"
            placeholder="Ej. Barra, banco"
            defaultValue={ejercicio?.equipo ?? ""}
          />
        </Campo>
        <Campo id="musculo_principal" label="Músculo principal">
          <Input
            id="musculo_principal"
            name="musculo_principal"
            defaultValue={ejercicio?.musculo_principal ?? ""}
          />
        </Campo>
        <Campo id="musculos_secundarios" label="Músculos secundarios">
          <Input
            id="musculos_secundarios"
            name="musculos_secundarios"
            defaultValue={ejercicio?.musculos_secundarios ?? ""}
          />
        </Campo>
        <Campo id="posicion_inicial" label="Posición inicial" className="sm:col-span-2 xl:col-span-3">
          <Textarea
            id="posicion_inicial"
            name="posicion_inicial"
            placeholder="Una indicación por línea"
            rows={4}
            defaultValue={ejercicio?.posicion_inicial ?? ""}
          />
        </Campo>
        <Campo id="ejecucion" label="Ejecución" className="sm:col-span-2 xl:col-span-3">
          <Textarea
            id="ejecucion"
            name="ejecucion"
            placeholder="Una indicación por línea"
            rows={4}
            defaultValue={ejercicio?.ejecucion ?? ""}
          />
        </Campo>
        <Campo id="notas" label="Notas" className="sm:col-span-2 xl:col-span-3">
          <Textarea
            id="notas"
            name="notas"
            rows={3}
            defaultValue={ejercicio?.notas ?? ""}
          />
        </Campo>
        <Campo
          id="url_referencia"
          label="URL de referencia"
          error={e.url_referencia}
          className="sm:col-span-2 xl:col-span-3"
        >
          <Input
            id="url_referencia"
            name="url_referencia"
            type="url"
            placeholder="https://…"
            defaultValue={ejercicio?.url_referencia ?? ""}
          />
        </Campo>
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
