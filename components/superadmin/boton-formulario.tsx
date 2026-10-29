"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

/** Botón "+ Nuevo …" arriba a la derecha de la grilla que abre/cierra su formulario (spec 49). */
export function BotonFormulario({
  etiqueta,
  children,
}: {
  etiqueta: string;
  children: React.ReactNode;
}) {
  const [abierto, setAbierto] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button onClick={() => setAbierto((v) => !v)} variant={abierto ? "secondary" : "default"}>
          {abierto ? "Cerrar" : etiqueta}
        </Button>
      </div>
      {abierto && (
        <Card>
          <CardContent className="pt-6">{children}</CardContent>
        </Card>
      )}
    </div>
  );
}
