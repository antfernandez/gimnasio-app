"use client";

import { useActionState } from "react";

import { crearAdmin, type CrearAdminFormState } from "@/app/superadmin/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function CrearAdminForm() {
  const [state, formAction, isPending] = useActionState<CrearAdminFormState, FormData>(
    crearAdmin,
    {},
  );

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="nombre_gimnasio">Nombre del gimnasio</Label>
          <Input id="nombre_gimnasio" name="nombre_gimnasio" required />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="nombre_completo">Nombre del dueño/a</Label>
          <Input id="nombre_completo" name="nombre_completo" required />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="email">Correo electrónico</Label>
          <Input id="email" name="email" type="email" required />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="password">Contraseña inicial</Label>
          <Input id="password" name="password" type="text" required minLength={6} />
        </div>
      </div>
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      {state.ok && (
        <p className="text-sm text-primary">
          Cuenta creada. Comparte el correo y la contraseña con el dueño/a por un
          canal seguro (no se envía correo automático).
        </p>
      )}
      <Button type="submit" size="lg" className="w-fit" disabled={isPending}>
        {isPending ? "Creando…" : "Crear cuenta de Admin"}
      </Button>
    </form>
  );
}
