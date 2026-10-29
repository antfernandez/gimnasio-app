import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { hoyIso } from "@/lib/turnos";
import { createAdminClient } from "@/lib/supabase/admin";
import { listarGimnasiosAdmin } from "@/lib/superadmin-datos";
import { estadoSuscripcion } from "@/lib/superadmin-metricas";
import { getSuperadminActual } from "@/lib/superadmin";

export const instant = false;

function Tarjeta({
  titulo,
  valor,
  href,
  nota,
}: {
  titulo: string;
  valor: number;
  href: string;
  nota?: string;
}) {
  return (
    <Link href={href} className="block">
      <Card className="h-full transition-colors hover:border-primary">
        <CardContent className="pt-6">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">{titulo}</div>
          <div className="mt-2 font-display text-4xl text-foreground">{valor}</div>
          {nota && <div className="mt-1 text-xs text-muted-foreground">{nota}</div>}
        </CardContent>
      </Card>
    </Link>
  );
}

// Solo `gimnasios`, `planes_sistema` y `solicitudes_pago` con `flujo = 'suscripcion'`:
// ninguna tabla de alumnos (el superadmin no accede a datos de un tenant).
export default async function SuperadminDashboardPage() {
  const superadmin = await getSuperadminActual();
  if (!superadmin) redirect("/auth/login/superadmin");

  const hoy = hoyIso();
  const inicioMes = `${hoy.slice(0, 7)}-01`;
  const admin = createAdminClient();

  const [gimnasios, { data: solicitudes }, { data: planes }] = await Promise.all([
    listarGimnasiosAdmin(),
    admin
      .from("solicitudes_pago")
      .select("estado, created_at, validado_at")
      .eq("flujo", "suscripcion"),
    admin.from("planes_sistema").select("id, nombre"),
  ]);

  const conteo = { activo: 0, moroso: 0, congelado: 0, cancelado: 0, sin_plan: 0 };
  const porPlan = new Map<string, number>();
  for (const g of gimnasios) {
    const e = estadoSuscripcion(g, hoy);
    conteo[e] += 1;
    if (g.plan_sistema_id && e !== "cancelado") {
      porPlan.set(g.plan_sistema_id, (porPlan.get(g.plan_sistema_id) ?? 0) + 1);
    }
  }
  const suscritos = gimnasios.filter((g) => g.plan_sistema_id).length;

  const filas = solicitudes ?? [];
  const porValidar = filas.filter((s) => s.estado === "pendiente").length;
  const delMes = (estado: string) =>
    filas.filter((s) => s.estado === estado && (s.validado_at ?? "") >= inicioMes).length;
  const validados = delMes("confirmado");
  const rechazados = delMes("rechazado");

  const distribucion = (planes ?? [])
    .map((p) => ({ nombre: p.nombre as string, n: porPlan.get(p.id as string) ?? 0 }))
    .filter((p) => p.n > 0);
  const maximo = Math.max(1, ...distribucion.map((p) => p.n));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="mb-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Panel Superadmin
        </div>
        <h2 className="text-2xl">Dashboard</h2>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Tarjeta titulo="Gimnasios suscritos" valor={suscritos} href="/superadmin/gimnasios" />
        <Tarjeta
          titulo="Activos"
          valor={conteo.activo}
          href="/superadmin/gimnasios?estado=activo"
          nota="Suscripción al día"
        />
        <Tarjeta
          titulo="Morosos"
          valor={conteo.moroso}
          href="/superadmin/gimnasios?estado=moroso"
          nota="Vencida, hasta 1 mes"
        />
        <Tarjeta
          titulo="Congelados"
          valor={conteo.congelado}
          href="/superadmin/gimnasios?estado=congelado"
          nota="Sin acceso por mora"
        />
        <Tarjeta
          titulo="Cancelados"
          valor={conteo.cancelado}
          href="/superadmin/gimnasios?estado=cancelado"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardContent className="pt-6">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Estado de pago
            </h3>
            <dl className="grid grid-cols-3 gap-4 text-center">
              <div>
                <dd className="font-display text-3xl">{porValidar}</dd>
                <dt className="text-xs text-muted-foreground">Por validar</dt>
              </div>
              <div>
                <dd className="font-display text-3xl">{validados}</dd>
                <dt className="text-xs text-muted-foreground">Validados del mes</dt>
              </div>
              <div>
                <dd className="font-display text-3xl">{rechazados}</dd>
                <dt className="text-xs text-muted-foreground">Rechazados del mes</dt>
              </div>
            </dl>
            <Button asChild variant="outline" className="mt-5">
              <Link href="/superadmin/suscripciones">Suscripciones por validar</Link>
            </Button>
            {conteo.sin_plan > 0 && (
              <p className="mt-4 text-xs text-muted-foreground">
                <Link href="/superadmin/gimnasios?estado=sin_plan" className="underline">
                  {conteo.sin_plan} gimnasio{conteo.sin_plan === 1 ? "" : "s"} sin plan
                </Link>{" "}
                (en prueba, no cuentan como morosos).
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Gimnasios por plan
            </h3>
            {distribucion.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aún no hay gimnasios con plan.</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {distribucion.map((p) => (
                  <li key={p.nombre} className="grid grid-cols-[110px_1fr_auto] items-center gap-3 text-sm">
                    <span>{p.nombre}</span>
                    <div className="h-2.5 rounded-full bg-secondary">
                      <div
                        className="h-2.5 rounded-full bg-primary"
                        style={{ width: `${(p.n / maximo) * 100}%` }}
                      />
                    </div>
                    <span className="tabular-nums">{p.n}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
