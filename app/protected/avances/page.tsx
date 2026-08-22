import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatFecha } from "@/lib/format";
import { getPerfilActual } from "@/lib/perfil";
import { createClient } from "@/lib/supabase/server";
import type { Alumno, Avance } from "@/lib/types";

export default async function AvancesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const params = await searchParams;
  const q = (params.q ?? "").trim();

  const perfilData = await getPerfilActual();
  if (!perfilData) return null; // el layout ya redirige a /auth/login

  const supabase = await createClient();
  let alumnosQuery = supabase
    .from("alumnos")
    .select("*")
    .eq("gimnasio_id", perfilData.perfil.gimnasio_id)
    .eq("activo", true)
    .order("apellidos", { ascending: true });

  if (q) {
    const qSafe = q.replace(/[,%]/g, "");
    alumnosQuery = alumnosQuery.or(
      `nombres.ilike.%${qSafe}%,apellidos.ilike.%${qSafe}%`,
    );
  }

  const [{ data: alumnos }, { data: avances }] = await Promise.all([
    alumnosQuery,
    supabase
      .from("avances")
      .select("*")
      .eq("gimnasio_id", perfilData.perfil.gimnasio_id)
      .order("fecha", { ascending: false }),
  ]);

  const lista = (alumnos ?? []) as Alumno[];
  const ultimoAvancePorAlumno = new Map<string, Avance>();
  for (const avance of (avances ?? []) as Avance[]) {
    if (!ultimoAvancePorAlumno.has(avance.alumno_id)) {
      ultimoAvancePorAlumno.set(avance.alumno_id, avance);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="mb-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Panel del dueño
        </div>
        <h2 className="text-2xl">Avances</h2>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="mb-5">
            <form
              className="min-w-[220px] max-w-xs"
              action="/protected/avances"
            >
              <Input
                type="search"
                name="q"
                placeholder="Buscar por nombre…"
                defaultValue={q}
              />
            </form>
          </div>

          {lista.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              {q
                ? "No hay alumnos que coincidan con tu búsqueda."
                : "Aún no tienes alumnos activos registrados."}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Alumno</TableHead>
                  <TableHead>Último registro</TableHead>
                  <TableHead>Peso</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lista.map((alumno) => {
                  const ultimo = ultimoAvancePorAlumno.get(alumno.id);
                  return (
                    <TableRow key={alumno.id}>
                      <TableCell className="font-medium text-foreground">
                        <Link
                          href={`/protected/avances/${alumno.id}`}
                          className="hover:text-primary hover:underline"
                        >
                          {alumno.nombres} {alumno.apellidos}
                        </Link>
                      </TableCell>
                      <TableCell>
                        {ultimo ? (
                          formatFecha(ultimo.fecha)
                        ) : (
                          <Badge variant="secondary">Sin avances</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {ultimo?.peso_kg ? `${ultimo.peso_kg} kg` : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Link
                          href={`/protected/avances/${alumno.id}`}
                          className="text-xs text-muted-foreground hover:text-primary hover:underline"
                        >
                          Ver / registrar avance
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
