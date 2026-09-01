"use client";

import { useState } from "react";

import { darDeBajaAdmin, editarAdmin, reactivarAdmin } from "@/app/superadmin/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Gimnasio, Perfil } from "@/lib/types";

export function AdminRow({
  perfil,
  gimnasio,
  email,
}: {
  perfil: Perfil;
  gimnasio: Gimnasio;
  email: string;
}) {
  const [editando, setEditando] = useState(false);
  const activo = gimnasio.estado === "activo";

  return (
    <Card>
      <CardContent className="pt-6">
        {editando ? (
          <form
            action={async (formData) => {
              await editarAdmin(formData);
              setEditando(false);
            }}
            className="flex flex-col gap-4"
          >
            <input type="hidden" name="perfil_id" value={perfil.id} />
            <input type="hidden" name="gimnasio_id" value={gimnasio.id} />
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor={`nombre_gimnasio_${gimnasio.id}`}>Gimnasio</Label>
                <Input
                  id={`nombre_gimnasio_${gimnasio.id}`}
                  name="nombre_gimnasio"
                  defaultValue={gimnasio.nombre}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor={`nombre_completo_${perfil.id}`}>Dueño/a</Label>
                <Input
                  id={`nombre_completo_${perfil.id}`}
                  name="nombre_completo"
                  defaultValue={perfil.nombre_completo}
                  required
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="submit" size="sm">
                Guardar
              </Button>
              <Button type="button" size="sm" variant="secondary" onClick={() => setEditando(false)}>
                Cancelar
              </Button>
            </div>
          </form>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="font-sans text-base font-semibold text-foreground">
                {gimnasio.nombre}
              </h3>
              <p className="text-sm text-muted-foreground">
                {perfil.nombre_completo} · {email}
              </p>
              <span
                className={
                  activo
                    ? "mt-2 inline-block rounded-full border border-border bg-primary/10 px-3 py-1 text-[0.66rem] uppercase tracking-wide text-secondary-foreground"
                    : "mt-2 inline-block rounded-full border border-destructive/40 bg-destructive/10 px-3 py-1 text-[0.66rem] uppercase tracking-wide text-destructive"
                }
              >
                {activo ? "Activo" : "Dado de baja"}
              </span>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" onClick={() => setEditando(true)}>
                Editar
              </Button>
              {activo ? (
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => darDeBajaAdmin(gimnasio.id)}
                >
                  Dar de baja
                </Button>
              ) : (
                <Button size="sm" onClick={() => reactivarAdmin(gimnasio.id)}>
                  Reactivar
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
