import { Badge } from "@/components/ui/badge";

export function FichaSaludBadge({ pendiente }: { pendiente: boolean }) {
  if (!pendiente) return <Badge variant="success">Completa</Badge>;
  return <Badge variant="destructive">Pendiente</Badge>;
}
