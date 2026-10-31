"use client";

import { Plus } from "lucide-react";
import { useState } from "react";

import { AsignarForm } from "@/components/nutricion/asignar-form";
import { Button } from "@/components/ui/button";

type Props = React.ComponentProps<typeof AsignarForm>;

/** Botón "Asignar alumno" sobre la grilla (spec 51): abre/cierra el formulario de asignación. */
export function AsignarPanel(props: Props) {
  const [abierto, setAbierto] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button type="button" size="lg" onClick={() => setAbierto((v) => !v)} aria-expanded={abierto}>
          <Plus className="h-4 w-4" />
          Asignar alumno
        </Button>
      </div>
      {abierto && (
        <div className="rounded-[9px] border border-border bg-card p-5">
          <h3 className="mb-4 text-base">Asignar alumno</h3>
          <AsignarForm {...props} />
        </div>
      )}
    </div>
  );
}
