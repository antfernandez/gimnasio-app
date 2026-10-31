"use client";

import { Plus, X } from "lucide-react";
import { useState } from "react";

import type { AvanceFormState } from "@/app/protected/alumnos/actions";
import { AvanceForm } from "@/components/avances/avance-form";
import { Button } from "@/components/ui/button";

/** Botón "+ Nuevo avance" (esquina superior derecha del cuadro de Medidas corporales,
 * spec 52) que abre el formulario de registro sobre la grilla. */
export function NuevoAvance({
  action,
}: {
  action: (state: AvanceFormState, formData: FormData) => Promise<AvanceFormState>;
}) {
  const [abierto, setAbierto] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button type="button" size="sm" onClick={() => setAbierto((v) => !v)} aria-expanded={abierto}>
          {abierto ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {abierto ? "Cancelar" : "Nuevo avance"}
        </Button>
      </div>
      {abierto && (
        <div className="rounded-[9px] border border-border p-5">
          <AvanceForm action={action} />
        </div>
      )}
    </div>
  );
}
