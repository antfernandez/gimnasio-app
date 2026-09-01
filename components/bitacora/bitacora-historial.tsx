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

function formatPlanificado(r: RegistroRutina): string {
  if (!r.series_planificadas && !r.reps_planificadas && !r.peso_planificado) return "—";
  const base = `${r.series_planificadas ?? "—"} × ${r.reps_planificadas ?? "—"}`;
  return r.peso_planificado ? `${base} · ${r.peso_planificado}` : base;
}

function formatRealizado(r: RegistroRutina): string {
  if (!r.series_realizadas && !r.reps_realizadas && !r.peso_kg) return "—";
  const base = `${r.series_realizadas ?? "—"} × ${r.reps_realizadas ?? "—"}`;
  return r.peso_kg ? `${base} · ${r.peso_kg} kg` : base;
}

export function BitacoraHistorial({ registros }: { registros: RegistroRutina[] }) {
  if (registros.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        Aún no hay sesiones registradas en la bitácora.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Fecha</TableHead>
          <TableHead>Ejercicio</TableHead>
          <TableHead>Planificado</TableHead>
          <TableHead>Realizado</TableHead>
          <TableHead>Notas</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {registros.map((r) => (
          <TableRow key={r.id}>
            <TableCell>{formatFecha(r.fecha)}</TableCell>
            <TableCell className="font-medium text-foreground">{r.ejercicio}</TableCell>
            <TableCell className="text-muted-foreground">{formatPlanificado(r)}</TableCell>
            <TableCell>{formatRealizado(r)}</TableCell>
            <TableCell className="max-w-[220px] truncate text-muted-foreground">
              {r.notas || "—"}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
