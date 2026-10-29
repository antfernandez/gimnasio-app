import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatMonto } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Plan } from "@/lib/types";

/** Spec 31, §4: planes que vende el gimnasio, con el del alumno marcado. */
export function PlanesGimnasioCards({
  planes,
  planActualId,
}: {
  planes: Plan[];
  planActualId: string | null;
}) {
  if (planes.length === 0) return null;
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {planes.map((p) => {
        const actual = p.id === planActualId;
        return (
          <Card key={p.id} className={cn(actual && "border-2 border-primary")}>
            <CardContent className="flex flex-col gap-1 py-5">
              <div className="flex items-center justify-between gap-2">
                <div className="text-lg font-semibold">{p.nombre}</div>
                {actual && <Badge variant="success">Plan actual</Badge>}
              </div>
              <div className="text-sm text-muted-foreground">
                {p.dias_por_semana} {p.dias_por_semana === 1 ? "clase" : "clases"} por semana
              </div>
              {p.precio != null && (
                <>
                  <div className="mt-2 text-2xl font-bold">{formatMonto(Number(p.precio))}</div>
                  <div className="text-xs text-muted-foreground">por mes</div>
                </>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
