import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatFecha } from "@/lib/format";
import type { Rutina } from "@/lib/types";

export function RutinaCard({ rutina }: { rutina: Rutina }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h4 className="font-sans text-base font-semibold text-foreground">
              {rutina.nombre}
            </h4>
            {rutina.objetivo && (
              <p className="text-sm text-muted-foreground">
                {rutina.objetivo}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">
              Asignada el {formatFecha(rutina.fecha_asignacion)}
            </span>
            <Badge variant={rutina.activa ? "success" : "secondary"}>
              {rutina.activa ? "Vigente" : "Anterior"}
            </Badge>
          </div>
        </div>
        {rutina.contenido.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin ejercicios.</p>
        ) : (
          <ul className="flex flex-col gap-1.5 text-sm">
            {rutina.contenido.map((ej, i) => (
              <li
                key={i}
                className="flex flex-wrap gap-x-3 gap-y-0.5 rounded-[9px] bg-secondary/40 px-3.5 py-2"
              >
                <span className="font-medium text-foreground">
                  {ej.ejercicio}
                </span>
                <span className="text-muted-foreground">
                  {ej.series ? `${ej.series} series` : null}
                  {ej.series && ej.reps ? " · " : null}
                  {ej.reps ? `${ej.reps} reps` : null}
                  {(ej.series || ej.reps) && ej.peso ? " · " : null}
                  {ej.peso ? ej.peso : null}
                </span>
                {ej.notas && (
                  <span className="text-muted-foreground">— {ej.notas}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
