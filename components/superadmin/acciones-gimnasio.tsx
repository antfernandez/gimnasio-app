"use client";

import Link from "next/link";
import { useTransition } from "react";

import { cambiarEstadoGimnasio } from "@/app/superadmin/gimnasios/actions";
import { Button } from "@/components/ui/button";

export function AccionesGimnasio({ id, cancelado }: { id: string; cancelado: boolean }) {
  const [pendiente, iniciar] = useTransition();

  return (
    <div className="flex gap-2">
      <Button asChild size="sm" variant="secondary">
        <Link href={`/superadmin/gimnasios/${id}`}>Editar</Link>
      </Button>
      {cancelado ? (
        <Button
          size="sm"
          disabled={pendiente}
          onClick={() => iniciar(() => cambiarEstadoGimnasio(id, true))}
        >
          Reactivar
        </Button>
      ) : (
        <Button
          size="sm"
          variant="destructive"
          disabled={pendiente}
          onClick={() => {
            if (confirm("¿Eliminar (dar de baja) este gimnasio? Su dueño/a perderá el acceso.")) {
              iniciar(() => cambiarEstadoGimnasio(id, false));
            }
          }}
        >
          Eliminar
        </Button>
      )}
    </div>
  );
}
