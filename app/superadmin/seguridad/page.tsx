import { redirect } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TIPOS_EVENTO } from "@/lib/seguridad-eventos";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSuperadminActual } from "@/lib/superadmin";

export const instant = false;

// Spec 69: últimos 100 eventos de seguridad con filtro por tipo. Sólo superadmin.
export default async function SeguridadPage({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string }>;
}) {
  const { tipo = "" } = await searchParams;
  const superadmin = await getSuperadminActual();
  if (!superadmin) redirect("/auth/login/superadmin");

  const admin = createAdminClient();
  // Retención de 12 meses: limpieza al leer (no bloquea si falla).
  await admin.rpc("purgar_eventos_seguridad");

  let consulta = admin
    .from("eventos_seguridad")
    .select("id, created_at, tipo, gimnasio_id, usuario_id, detalle, ip")
    .order("created_at", { ascending: false })
    .limit(100);
  if ((TIPOS_EVENTO as readonly string[]).includes(tipo)) consulta = consulta.eq("tipo", tipo);
  const { data } = await consulta;
  const eventos = data ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="mb-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Panel Superadmin
        </div>
        <h2 className="text-2xl">Seguridad</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Últimos 100 eventos. Los inicios de sesión fallidos están en Supabase → Authentication → Logs.
        </p>
      </div>

      <form className="flex flex-wrap items-end gap-3">
        <Select name="tipo" defaultValue={tipo} aria-label="Tipo de evento">
          <option value="">Todos los tipos</option>
          {TIPOS_EVENTO.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </Select>
        <Button type="submit" variant="outline">
          Filtrar
        </Button>
      </form>

      <Card>
        <CardContent className="pt-6">
          {eventos.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin eventos.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Detalle</TableHead>
                  <TableHead>IP</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {eventos.map((e) => (
                  <TableRow key={e.id as string}>
                    <TableCell className="whitespace-nowrap">
                      {new Date(e.created_at as string).toLocaleString("es-CL")}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{e.tipo as string}</Badge>
                    </TableCell>
                    <TableCell className="max-w-[420px] break-words font-mono text-xs">
                      {JSON.stringify(e.detalle)}
                    </TableCell>
                    <TableCell>{(e.ip as string | null) ?? "—"}</TableCell>
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
