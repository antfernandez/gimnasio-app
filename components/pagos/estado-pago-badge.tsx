import { Badge } from "@/components/ui/badge";
import type { EstadoPago } from "@/lib/types";

const CONFIG: Record<EstadoPago, { label: string; variant: "success" | "destructive" | "secondary" }> = {
  al_dia: { label: "Al día", variant: "success" },
  atrasado: { label: "Atrasado", variant: "destructive" },
  sin_pagos: { label: "Sin pagos", variant: "secondary" },
};

export function EstadoPagoBadge({ estado }: { estado: EstadoPago }) {
  const config = CONFIG[estado];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
