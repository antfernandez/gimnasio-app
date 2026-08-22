import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { createAvance } from "@/app/protected/avances/actions";
import { AvanceForm } from "@/components/avances/avance-form";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatFecha } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { Alumno, Avance, MedidasAvance } from "@/lib/types";

function formatMedidas(medidas: MedidasAvance): string {
  const partes: string[] = [];
  if (medidas.cintura_cm) partes.push(`Cintura ${medidas.cintura_cm}cm`);
  if (medidas.cadera_cm) partes.push(`Cadera ${medidas.cadera_cm}cm`);
  if (medidas.pecho_cm) partes.push(`Pecho ${medidas.pecho_cm}cm`);
  if (medidas.brazo_cm) partes.push(`Brazo ${medidas.brazo_cm}cm`);
  return partes.length > 0 ? partes.join(" · ") : "—";
}

export default async function AvancesAlumnoPage({
  params,
  searchParams,
}: {
  params: Promise<{ alumnoId: string }>;
  searchParams: Promise<{ registrado?: string }>;
}) {
  const { alumnoId } = await params;
  const { registrado } = await searchParams;

  const supabase = await createClient();
  const { data: alumno } = await supabase
    .from("alumnos")
    .select("*")
    .eq("id", alumnoId)
    .maybeSingle();

  if (!alumno) notFound();
  const a = alumno as Alumno;

  const { data: avances } = await supabase
    .from("avances")
    .select("*")
    .eq("alumno_id", alumnoId)
    .order("fecha", { ascending: false });

  const historial = (avances ?? []) as Avance[];
  const createAvanceConId = createAvance.bind(null, a.id);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/protected/avances"
          className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Volver a avances
        </Link>
        <div className="mb-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Avances de
        </div>
        <h2 className="text-2xl">
          {a.nombres} {a.apellidos}
        </h2>
      </div>

      {registrado === "1" && (
        <div className="rounded-[9px] border border-success/35 bg-success/10 px-4 py-3 text-sm text-success">
          Avance registrado correctamente.
        </div>
      )}

      <Card>
        <CardContent className="pt-6">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Registrar avance
          </h3>
          <AvanceForm action={createAvanceConId} />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Historial de avances
          </h3>
          {historial.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Aún no hay avances registrados para este alumno.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Peso</TableHead>
                  <TableHead>Medidas</TableHead>
                  <TableHead>Notas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {historial.map((avance) => (
                  <TableRow key={avance.id}>
                    <TableCell>{formatFecha(avance.fecha)}</TableCell>
                    <TableCell className="font-medium text-foreground">
                      {avance.peso_kg ? `${avance.peso_kg} kg` : "—"}
                    </TableCell>
                    <TableCell>{formatMedidas(avance.medidas)}</TableCell>
                    <TableCell className="max-w-[220px] truncate text-muted-foreground">
                      {avance.notas || "—"}
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
