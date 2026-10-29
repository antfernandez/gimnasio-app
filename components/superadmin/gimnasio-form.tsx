"use client";

import { useActionState } from "react";

import { editarGimnasio, type GimnasioFormState } from "@/app/superadmin/gimnasios/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

export interface OpcionPlan {
  id: string;
  nombre: string;
  etiqueta: string;
}

export function GimnasioForm({
  gimnasioId,
  duenoId,
  nombreGimnasio,
  nombreDueno,
  email,
  planId,
  suscripcionHasta,
  planes,
}: {
  gimnasioId: string;
  duenoId: string | null;
  nombreGimnasio: string;
  nombreDueno: string;
  email: string;
  planId: string | null;
  suscripcionHasta: string | null;
  planes: OpcionPlan[];
}) {
  const [state, formAction, isPending] = useActionState<GimnasioFormState, FormData>(
    editarGimnasio,
    {},
  );

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <input type="hidden" name="gimnasio_id" value={gimnasioId} />
      <input type="hidden" name="dueno_id" value={duenoId ?? ""} />
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        <div className="grid gap-2">
          <Label htmlFor="nombre_gimnasio">Nombre del gimnasio</Label>
          <Input id="nombre_gimnasio" name="nombre_gimnasio" defaultValue={nombreGimnasio} required />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="nombre_completo">Nombre del dueño/a</Label>
          <Input id="nombre_completo" name="nombre_completo" defaultValue={nombreDueno} required />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="email">Correo electrónico</Label>
          <Input id="email" name="email" type="email" defaultValue={email} required />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="password">Nueva contraseña (opcional)</Label>
          <Input id="password" name="password" type="text" minLength={6} placeholder="Sin cambios" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="plan_sistema_id">Plan del sistema</Label>
          <Select id="plan_sistema_id" name="plan_sistema_id" defaultValue={planId ?? ""}>
            <option value="">Sin plan</option>
            {planes.map((p) => (
              <option key={p.id} value={p.id}>
                {p.etiqueta}
              </option>
            ))}
          </Select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="suscripcion_hasta">Suscripción vence</Label>
          <Input
            id="suscripcion_hasta"
            name="suscripcion_hasta"
            type="date"
            defaultValue={suscripcionHasta ?? ""}
          />
        </div>
      </div>
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      {state.ok && <p className="text-sm text-primary">{state.ok}</p>}
      <Button type="submit" size="lg" className="w-fit" disabled={isPending}>
        {isPending ? "Guardando…" : "Guardar cambios"}
      </Button>
    </form>
  );
}
