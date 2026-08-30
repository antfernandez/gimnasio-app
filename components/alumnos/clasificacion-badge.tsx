import { Badge } from "@/components/ui/badge";
import type { ClasificacionAlumno } from "@/lib/types";

const CONFIG: Record<
  ClasificacionAlumno,
  { label: string; variant: "success" | "secondary" | "outline" }
> = {
  activo: { label: "Activo", variant: "success" },
  inactivo: { label: "Inactivo", variant: "secondary" },
  de_prueba: { label: "De prueba", variant: "outline" },
};

export function ClasificacionBadge({
  clasificacion,
}: {
  clasificacion: ClasificacionAlumno;
}) {
  const config = CONFIG[clasificacion];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
