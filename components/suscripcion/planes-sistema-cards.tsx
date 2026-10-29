"use client";

import { Check } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatMonto } from "@/lib/format";
import {
  FUNCIONES_SISTEMA,
  FUNCIONES_VISIBLES,
  PLANES_SISTEMA,
} from "@/lib/planes-sistema";
import { cn } from "@/lib/utils";

export function PlanesSistemaCards({
  planActual,
  alumnosActivos,
}: {
  planActual: string | null;
  alumnosActivos: number | null;
}) {
  const [expandido, setExpandido] = useState(false);
  const funciones = expandido ? FUNCIONES_SISTEMA : FUNCIONES_SISTEMA.slice(0, FUNCIONES_VISIBLES);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 md:grid-cols-3">
        {PLANES_SISTEMA.map((p) => {
          const actual = p.nombre === planActual;
          return (
            <Card key={p.nombre} className={cn(actual && "border-2 border-primary")}>
              <CardContent className="flex flex-col gap-1 py-5">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-lg font-semibold">{p.nombre}</div>
                  {actual && <Badge variant="success">Plan actual</Badge>}
                </div>
                <div className="text-sm text-muted-foreground">Hasta {p.maxAlumnos} alumnos</div>
                <div className="mt-2 text-2xl font-bold">{formatMonto(p.precioNeto)}</div>
                <div className="text-xs text-muted-foreground">+ IVA por mes</div>
                {actual && alumnosActivos !== null && (
                  <div className="mt-2 text-xs text-muted-foreground">
                    {alumnosActivos} de {p.maxAlumnos} alumnos activos
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardContent className="py-5">
          <div className="mb-3 text-sm font-semibold">Incluido en todos los planes</div>
          <ul className="grid gap-3 sm:grid-cols-2">
            {funciones.map((f) => (
              <li key={f.titulo} className="flex gap-2 text-sm">
                <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>
                  <strong>{f.titulo}</strong> — {f.detalle}
                </span>
              </li>
            ))}
          </ul>
          <Button
            type="button"
            variant="link"
            className="mt-3 h-auto p-0"
            onClick={() => setExpandido((v) => !v)}
          >
            {expandido ? "− funciones" : "+ funciones"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
