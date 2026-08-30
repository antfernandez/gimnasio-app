import { Badge } from "@/components/ui/badge";
import type { EstadoPaquete } from "@/lib/types";

const CONFIG: Record<EstadoPaquete, { label: string; variant: "success" | "default" | "secondary" }> = {
  vigente: { label: "Vigente", variant: "success" },
  por_vencer: { label: "Por vencer", variant: "default" },
  sin_paquete: { label: "Sin paquete", variant: "secondary" },
};

export function EstadoPaqueteBadge({ estado }: { estado: EstadoPaquete }) {
  const config = CONFIG[estado];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
