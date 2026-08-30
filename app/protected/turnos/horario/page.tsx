import Link from "next/link";

import { AplicarPresetButton } from "@/components/turnos/aplicar-preset-button";
import { HorarioForm } from "@/components/turnos/horario-form";
import { HorarioRowActions } from "@/components/turnos/horario-row-actions";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getPerfilActual } from "@/lib/perfil";
import { createClient } from "@/lib/supabase/server";
import { formatHora, NOMBRES_DIA } from "@/lib/turnos";
import type { HorarioDisponible } from "@/lib/types";

export default async function HorarioPage() {
  const perfilData = await getPerfilActual();
  if (!perfilData) return null; // el layout ya redirige a /auth/login

  const supabase = await createClient();
  const { data: horarios } = await supabase
    .from("horarios_disponibles")
    .select("*")
    .eq("gimnasio_id", perfilData.perfil.gimnasio_id)
    .order("dia_semana", { ascending: true })
    .order("hora_inicio", { ascending: true });

  const lista = (horarios ?? []) as HorarioDisponible[];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="mb-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Panel del dueño
        </div>
        <h2 className="text-2xl">Configurar horario</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Define qué días y horas atiendes, y cuántos cupos hay por turno. El
          calendario de{" "}
          <Link href="/protected/turnos" className="text-primary hover:underline">
            turnos
          </Link>{" "}
          se arma automáticamente a partir de esto.
        </p>
      </div>

      {lista.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-start gap-3 pt-6">
            <p className="text-sm text-muted-foreground">
              Aún no configuras ningún horario. Puedes empezar desde cero con el
              formulario de abajo, o cargar el horario real de Valinor Estudio como
              punto de partida y editarlo después.
            </p>
            <AplicarPresetButton />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="pt-6">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Agregar horario
          </h3>
          <HorarioForm />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Horarios configurados
          </h3>
          {lista.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Todavía no hay horarios configurados.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Día</TableHead>
                  <TableHead>Hora</TableHead>
                  <TableHead>Duración</TableHead>
                  <TableHead>Cupos</TableHead>
                  <TableHead className="text-right">Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lista.map((h) => (
                  <TableRow key={h.id} className={h.activo ? "" : "opacity-50"}>
                    <TableCell className="font-medium text-foreground">
                      {NOMBRES_DIA[h.dia_semana]}
                    </TableCell>
                    <TableCell>{formatHora(h.hora_inicio)}</TableCell>
                    <TableCell>{h.duracion_min} min</TableCell>
                    <TableCell>{h.cupos}</TableCell>
                    <TableCell className="text-right">
                      <HorarioRowActions id={h.id} activo={h.activo} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
