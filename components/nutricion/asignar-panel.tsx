import Link from "next/link";

import { AsignarForm } from "@/components/nutricion/asignar-form";
import { Button } from "@/components/ui/button";

type Props = React.ComponentProps<typeof AsignarForm> & { abierto: boolean };

/** Formulario de asignación (spec 51/80): se abre con `?nuevo=1` desde el botón de las pestañas. */
export function AsignarPanel({ abierto, ...props }: Props) {
  if (!abierto) return null;
  return (
    <div className="rounded-[9px] border border-border bg-card p-5">
      <h3 className="mb-4 text-base">Asignar alumno</h3>
      <AsignarForm {...props} />
      <Button asChild size="sm" variant="ghost" className="mt-3">
        <Link href="/protected/nutricion/asignar">Cancelar</Link>
      </Button>
    </div>
  );
}
