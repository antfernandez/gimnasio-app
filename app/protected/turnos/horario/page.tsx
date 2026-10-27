import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { AplicarPresetButton } from "@/components/turnos/aplicar-preset-button";
import { DuplicarDiaForm } from "@/components/turnos/duplicar-dia-form";
import { HorarioForm } from "@/components/turnos/horario-form";
import { HorarioRowActions } from "@/components/turnos/horario-row-actions";
import { SemanaTipoForm } from "@/components/turnos/semana-tipo-form";
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
import { formatHora, NOMBRES_DIA, NOMBRES_DIA_CORTO, ORDEN_DIAS } from "@/lib/turnos";
import type { DiaSemana, HorarioDisponible } from "@/lib/types";
import { cn } from "@/lib/utils";

export default async function HorarioPage({
  searchParams,
}: {
  searchParams: Promise<{ dia?: string }>;
}) {
  const params = await searchParams;
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
  const diasConHorario = ORDEN_DIAS.filter((d) => lista.some((h) => h.dia_semana === d));
  // Se muestra un solo día; por defecto el primero con horarios (semana desde lunes).
  const diaPedido = Number(params.dia);
  const diaVisible: DiaSemana =
    params.dia !== undefined && ORDEN_DIAS.includes(diaPedido as DiaSemana)
      ? (diaPedido as DiaSemana)
      : (diasConHorario[0] ?? 1);
  const delDia = lista.filter((h) => h.dia_semana === diaVisible);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/protected/turnos"
          className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Volver a turnos
        </Link>
        <div className="mb-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Panel del dueño
        </div>
        <h2 className="text-2xl">Configurar horario</h2>
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

      {/* Bloques de un día (varios o uno suelto) en un mismo recuadro, separados
          sutilmente; después, duplicar a otros días. */}
      <Card>
        <CardContent className="pt-6">
          <h3 className="mb-1 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Cargar varios bloques de un día
          </h3>
          <p className="mb-4 text-sm text-muted-foreground">
            Arma de una vez todos los bloques de un día (tu &quot;semana tipo&quot;) y
            después duplícalo a los demás días con el mismo horario.
          </p>
          <SemanaTipoForm />

          <div className="mt-6 border-t border-border/60 pt-6">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Agregar un bloque suelto
            </h3>
            <HorarioForm />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <h3 className="mb-1 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Duplicar un día a otros
          </h3>
          <p className="mb-4 text-sm text-muted-foreground">
            Copia todos los bloques de un día ya configurado hacia otros días (ej.
            lunes a viernes con el mismo horario).
          </p>
          <DuplicarDiaForm diasConHorario={diasConHorario} />
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
            <>
              <div className="mb-4 flex flex-wrap gap-2">
                {ORDEN_DIAS.map((d) => (
                  <Link
                    key={d}
                    href={{ pathname: "/protected/turnos/horario", query: { dia: d } }}
                    aria-label={NOMBRES_DIA[d]}
                    className={cn(
                      "rounded-full border border-border px-4 py-1.5 text-xs text-muted-foreground transition-colors",
                      diaVisible === d &&
                        "border-transparent bg-primary font-semibold text-primary-foreground",
                    )}
                  >
                    {NOMBRES_DIA_CORTO[d]}
                  </Link>
                ))}
              </div>
              {delDia.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No hay horarios configurados el {NOMBRES_DIA[diaVisible].toLowerCase()}.
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
                    {delDia.map((h) => (
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
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
