import { PermisosTabla, type FilaPermisos } from "@/components/permisos/permisos-tabla";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { getPerfilActual } from "@/lib/perfil";
import { createClient } from "@/lib/supabase/server";
import type { Alumno } from "@/lib/types";

export default async function PermisosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; estado?: string }>;
}) {
  const params = await searchParams;
  const q = (params.q ?? "").trim();
  const estado = params.estado === "inactivos" || params.estado === "todos" ? params.estado : "activos";

  const perfilData = await getPerfilActual();
  if (!perfilData) return null; // el layout ya redirige a /auth/login

  const supabase = await createClient();
  let query = supabase
    .from("alumnos")
    .select("id, rut, dig_ver, nombres, apellidos, activo, puede_registrar_avances, puede_registrar_bitacora")
    .eq("gimnasio_id", perfilData.perfil.gimnasio_id)
    .order("nombres", { ascending: true })
    .order("apellidos", { ascending: true });

  if (estado !== "todos") query = query.eq("activo", estado === "activos");
  if (q) {
    const qSafe = q.replace(/[,%()]/g, "");
    const rutNum = Number.parseInt(qSafe.replace(/\D/g, ""), 10);
    query = query.or(
      [`nombres.ilike.%${qSafe}%`, `apellidos.ilike.%${qSafe}%`, ...(rutNum ? [`rut.eq.${rutNum}`] : [])].join(","),
    );
  }

  const { data } = await query;
  const filas: FilaPermisos[] = (
    (data ?? []) as Pick<
      Alumno,
      "id" | "rut" | "dig_ver" | "nombres" | "apellidos" | "activo" | "puede_registrar_avances" | "puede_registrar_bitacora"
    >[]
  ).map((a) => ({
    id: a.id,
    nombre: `${a.nombres} ${a.apellidos}`,
    rut: `${a.rut}-${a.dig_ver}`,
    activo: a.activo,
    puede_registrar_avances: a.puede_registrar_avances,
    puede_registrar_bitacora: a.puede_registrar_bitacora,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="mb-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Panel del dueño
        </div>
        <h2 className="text-2xl">Permisos</h2>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form className="mb-5 flex flex-wrap items-center gap-3" action="/protected/permisos">
            <Input
              type="search"
              name="q"
              placeholder="Buscar por nombre o RUT…"
              defaultValue={q}
              className="min-w-[220px] max-w-xs flex-1"
            />
            <Select name="estado" defaultValue={estado} aria-label="Filtrar por estado" className="w-auto">
              <option value="activos">Activos</option>
              <option value="inactivos">De baja</option>
              <option value="todos">Todos</option>
            </Select>
            <Button type="submit" variant="outline">
              Filtrar
            </Button>
          </form>
          <PermisosTabla key={`${q}|${estado}`} filas={filas} puedeEditar={perfilData.perfil.rol === "dueño"} />
        </CardContent>
      </Card>
    </div>
  );
}
