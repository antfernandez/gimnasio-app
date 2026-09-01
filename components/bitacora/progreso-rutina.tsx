import { LineChart } from "@/components/charts/line-chart";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatFecha } from "@/lib/format";
import type { RegistroRutina } from "@/lib/types";

/** Compara, ejercicio a ejercicio, lo planificado contra lo registrado en la
 * bitácora a lo largo del tiempo — gráfico de repeticiones (el peso queda solo en
 * la tabla, unidades distintas). */
export function ProgresoRutina({ registros }: { registros: RegistroRutina[] }) {
  if (registros.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        Todavía no hay registros de bitácora para mostrar progreso.
      </p>
    );
  }

  const porEjercicio = new Map<string, RegistroRutina[]>();
  for (const r of registros) {
    const lista = porEjercicio.get(r.ejercicio) ?? [];
    lista.push(r);
    porEjercicio.set(r.ejercicio, lista);
  }

  return (
    <div className="flex flex-col gap-8">
      {[...porEjercicio.entries()].map(([ejercicio, filas]) => {
        const ordenadas = [...filas].sort((a, b) => (a.fecha < b.fecha ? -1 : 1));
        const puntos = ordenadas
          .filter((r) => r.reps_realizadas != null)
          .map((r) => ({ x: r.fecha, y: r.reps_realizadas! }));

        return (
          <div key={ejercicio} className="flex flex-col gap-3">
            <h4 className="font-sans text-sm font-semibold text-foreground">
              {ejercicio}
            </h4>
            <LineChart data={puntos} unidad=" reps" />
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Series</TableHead>
                  <TableHead>Reps</TableHead>
                  <TableHead>Peso</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ordenadas.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{formatFecha(r.fecha)}</TableCell>
                    <TableCell>{r.series_realizadas ?? "—"}</TableCell>
                    <TableCell>{r.reps_realizadas ?? "—"}</TableCell>
                    <TableCell>{r.peso_kg ? `${r.peso_kg} kg` : "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        );
      })}
    </div>
  );
}
