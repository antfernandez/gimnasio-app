import { CreditCard, type LucideIcon, Users } from "lucide-react";
import Link from "next/link";

import { EstadoPagoBadge } from "@/components/pagos/estado-pago-badge";
import { Card, CardContent } from "@/components/ui/card";
import { getPerfilActual } from "@/lib/perfil";
import { createClient } from "@/lib/supabase/server";
import type { EstadoPagoAlumno } from "@/lib/types";

function StatCard({
  icon: Icon,
  label,
  value,
  tone = "default",
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  tone?: "default" | "warning";
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 pt-6">
        <div
          className={
            tone === "warning"
              ? "flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-destructive/15 text-destructive"
              : "flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/15 text-secondary-foreground"
          }
        >
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <div className="font-display text-2xl font-semibold text-foreground">
            {value}
          </div>
          <div className="text-sm text-muted-foreground">{label}</div>
        </div>
      </CardContent>
    </Card>
  );
}

export default async function DashboardPage() {
  const perfilData = await getPerfilActual();
  if (!perfilData) return null; // el layout ya redirige a /auth/login

  const supabase = await createClient();
  const [{ count: alumnosActivos }, { data: estados }] = await Promise.all([
    supabase
      .from("alumnos")
      .select("*", { count: "exact", head: true })
      .eq("gimnasio_id", perfilData.perfil.gimnasio_id)
      .eq("activo", true),
    supabase
      .from("v_estado_pago_alumnos")
      .select("*")
      .eq("gimnasio_id", perfilData.perfil.gimnasio_id)
      .eq("activo", true)
      .neq("estado_pago", "al_dia"),
  ]);

  const orden = { atrasado: 0, sin_pagos: 1, al_dia: 2 };
  const pendientes = ((estados ?? []) as EstadoPagoAlumno[]).sort(
    (a, b) => orden[a.estado_pago] - orden[b.estado_pago],
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="mb-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Panel del dueño
        </div>
        <h2 className="text-2xl">Dashboard</h2>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard icon={Users} label="Alumnos activos" value={alumnosActivos ?? 0} />
        <StatCard
          icon={CreditCard}
          label="Pagos pendientes este mes"
          value={pendientes.length}
          tone={pendientes.length > 0 ? "warning" : "default"}
        />
      </div>

      <Card>
        <CardContent className="pt-6">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Alumnos con pago pendiente
          </h3>
          {pendientes.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Todos los alumnos activos están al día con su pago.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {pendientes.slice(0, 8).map((row) => (
                <Link
                  key={row.alumno_id}
                  href={`/protected/pagos/${row.alumno_id}`}
                  className="flex items-center justify-between rounded-[9px] px-3.5 py-2.5 text-sm hover:bg-primary/10"
                >
                  <span className="font-medium text-foreground">
                    {row.nombres} {row.apellidos}
                  </span>
                  <EstadoPagoBadge estado={row.estado_pago} />
                </Link>
              ))}
              {pendientes.length > 8 && (
                <Link
                  href="/protected/pagos"
                  className="mt-1 text-xs text-muted-foreground hover:text-primary hover:underline"
                >
                  Ver los {pendientes.length} pendientes en Pagos →
                </Link>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
