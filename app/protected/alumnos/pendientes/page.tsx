import Link from "next/link";

import { aprobarAlumno, rechazarAlumno } from "@/app/protected/alumnos/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatFecha } from "@/lib/format";
import { getPerfilActual } from "@/lib/perfil";
import { formatRut } from "@/lib/rut";
import { createClient } from "@/lib/supabase/server";
import type { Alumno } from "@/lib/types";

export const instant = false;

async function aprobar(id: string) {
  "use server";
  await aprobarAlumno(id);
}

async function rechazar(id: string) {
  "use server";
  await rechazarAlumno(id);
}

export default async function AlumnosPendientesPage() {
  const perfilData = await getPerfilActual();
  if (!perfilData) return null; // el layout ya redirige a /auth/login

  const supabase = await createClient();
  const { data } = await supabase
    .from("alumnos")
    .select("*")
    .eq("gimnasio_id", perfilData.perfil.gimnasio_id)
    .eq("estado_aprobacion", "pendiente")
    .order("created_at", { ascending: true });

  const pendientes = (data ?? []) as Alumno[];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="mb-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Panel del dueño
        </div>
        <h2 className="text-2xl">Alumnos pendientes de aprobación</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Se autorregistraron desde el sitio público. Mientras no los apruebes no
          pueden reservar turnos ni operar en el portal.{" "}
          <Link
            href="/protected/alumnos"
            className="text-secondary-foreground underline underline-offset-4"
          >
            Ver todos los alumnos
          </Link>
        </p>
      </div>

      {pendientes.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          No hay solicitudes pendientes.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {pendientes.map((alumno) => (
            <Card key={alumno.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-4 pt-6">
                <div>
                  <h3 className="font-sans text-base font-semibold text-foreground">
                    {alumno.nombres} {alumno.apellidos}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    RUT {formatRut(alumno.rut, alumno.dig_ver)} · Solicitado el{" "}
                    {formatFecha(alumno.created_at.slice(0, 10))}
                  </p>
                  {(alumno.email || alumno.telefono) && (
                    <p className="text-sm text-muted-foreground">
                      {[alumno.email, alumno.telefono].filter(Boolean).join(" · ")}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <form action={rechazar.bind(null, alumno.id)}>
                    <Button type="submit" size="sm" variant="destructive">
                      Rechazar
                    </Button>
                  </form>
                  <form action={aprobar.bind(null, alumno.id)}>
                    <Button type="submit" size="sm">
                      Aprobar
                    </Button>
                  </form>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
