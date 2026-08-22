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
import { getPerfilActual } from "@/lib/perfil";
import { createClient } from "@/lib/supabase/server";
import type { Alumno, Rutina } from "@/lib/types";

export default async function RutinasPage({
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

  const [{ data: alumnos }, { data: rutinasActivas }] = await Promise.all([
    alumnosQuery,
    supabase
      .from("rutinas")
      .select("*")
      .eq("gimnasio_id", perfilData.perfil.gimnasio_id)
      .eq("activa", true),
  ]);

  const lista = (alumnos ?? []) as Alumno[];
  const rutinaPorAlumno = new Map<string, Rutina>(
    ((rutinasActivas ?? []) as Rutina[]).map((r) => [r.alumno_id, r]),
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="mb-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Panel del dueño
        </div>
        <h2 className="text-2xl">Rutinas</h2>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="mb-5">
            <form
              className="min-w-[220px] max-w-xs"
              action="/protected/rutinas"
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
                  <TableHead>Rutina vigente</TableHead>
                  <TableHead>Objetivo</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lista.map((alumno) => {
                  const rutina = rutinaPorAlumno.get(alumno.id);
                  return (
                    <TableRow key={alumno.id}>
                      <TableCell className="font-medium text-foreground">
                        <Link
                          href={`/protected/rutinas/${alumno.id}`}
                          className="hover:text-primary hover:underline"
                        >
                          {alumno.nombres} {alumno.apellidos}
                        </Link>
                      </TableCell>
                      <TableCell>
                        {rutina ? (
                          rutina.nombre
                        ) : (
                          <Badge variant="secondary">Sin rutina</Badge>
                        )}
                      </TableCell>
                      <TableCell>{rutina?.objetivo || "—"}</TableCell>
                      <TableCell className="text-right">
                        <Link
                          href={`/protected/rutinas/${alumno.id}`}
                          className="text-xs text-muted-foreground hover:text-primary hover:underline"
                        >
                          Ver / asignar rutina
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
