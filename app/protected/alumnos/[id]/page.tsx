import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { updateAlumno } from "@/app/protected/alumnos/actions";
import { AlumnoForm } from "@/components/alumnos/alumno-form";
import { ClasificacionBadge } from "@/components/alumnos/clasificacion-badge";
import { FichaSaludBadge } from "@/components/alumnos/ficha-salud-badge";
import { ToggleActivoButton } from "@/components/alumnos/toggle-activo-button";
import { ToggleAvancesButton } from "@/components/alumnos/toggle-avances-button";
import { ToggleBitacoraButton } from "@/components/alumnos/toggle-bitacora-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { fichaSaludPendiente } from "@/lib/ficha-salud";
import { formatFecha } from "@/lib/format";
import { getPerfilActual } from "@/lib/perfil";
import { formatRut } from "@/lib/rut";
import { createClient } from "@/lib/supabase/server";
import type { Alumno, ClasificacionAlumnoRow, Plan } from "@/lib/types";

export default async function FichaAlumnoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const perfilData = await getPerfilActual();
  if (!perfilData) return null; // el layout ya redirige a /auth/login

  const supabase = await createClient();
  const { data: alumno } = await supabase
    .from("alumnos")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!alumno) notFound();

  const a = alumno as Alumno;
  const updateAlumnoConId = updateAlumno.bind(null, a.id);

  const [{ data: clasificacionRow }, { data: planes }] = await Promise.all([
    supabase
      .from("v_clasificacion_alumnos")
      .select("clasificacion")
      .eq("alumno_id", a.id)
      .maybeSingle(),
    supabase
      .from("planes")
      .select("*")
      .eq("gimnasio_id", perfilData.perfil.gimnasio_id)
      .order("dias_por_semana", { ascending: true }),
  ]);
  const clasificacion = (
    clasificacionRow as Pick<ClasificacionAlumnoRow, "clasificacion"> | null
  )?.clasificacion;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/protected/alumnos"
          className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Volver a alumnos
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="mb-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Ficha de alumno
            </div>
            <h2 className="text-2xl">
              {a.nombres} {a.apellidos}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href={`/protected/pagos/${a.id}`}
              className="text-xs text-muted-foreground hover:text-primary hover:underline"
            >
              Ver pagos
            </Link>
            <Link
              href={`/protected/rutinas/${a.id}`}
              className="text-xs text-muted-foreground hover:text-primary hover:underline"
            >
              Ver rutinas
            </Link>
            <Badge variant={a.activo ? "success" : "secondary"}>
              {a.activo ? "Activo" : "De baja"}
            </Badge>
            {clasificacion && <ClasificacionBadge clasificacion={clasificacion} />}
            <FichaSaludBadge pendiente={fichaSaludPendiente(a)} />
            <ToggleActivoButton
              id={a.id}
              activo={a.activo}
              nombreCompleto={`${a.nombres} ${a.apellidos}`}
            />
          </div>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="mb-6 flex flex-wrap items-center gap-x-8 gap-y-1 text-xs text-muted-foreground">
            <span>RUT {formatRut(a.rut, a.dig_ver)}</span>
            <span>Alumno desde {formatFecha(a.fecha_inicio)}</span>
            <Badge variant={a.user_id ? "success" : "secondary"}>
              {a.user_id ? "Cuenta propia vinculada" : "Sin cuenta propia"}
            </Badge>
          </div>
          <AlumnoForm
            action={updateAlumnoConId}
            alumno={a}
            planes={(planes ?? []) as Plan[]}
            submitLabel="Guardar cambios"
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-4 pt-6">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Registro de avances propios
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {a.puede_registrar_avances
                ? "Este alumno puede registrar sus propios avances desde su portal."
                : "Solo tú puedes registrar avances para este alumno."}
            </p>
          </div>
          <ToggleAvancesButton
            id={a.id}
            puedeRegistrarAvances={a.puede_registrar_avances}
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-4 pt-6">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Registro de bitácora propio
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {a.puede_registrar_bitacora
                ? "Este alumno puede registrar sus propias sesiones de rutina desde su portal."
                : "Solo tú puedes registrar sesiones de rutina para este alumno."}
            </p>
          </div>
          <ToggleBitacoraButton
            id={a.id}
            puedeRegistrarBitacora={a.puede_registrar_bitacora}
          />
        </CardContent>
      </Card>
    </div>
  );
}
