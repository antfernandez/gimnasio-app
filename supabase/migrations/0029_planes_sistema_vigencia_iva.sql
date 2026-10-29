-- Spec 41: planes del sistema en BD con vigencia, IVA y funciones.
-- `precio_mensual` se conserva como precio NETO; el total = neto × (1 + iva_pct/100).
-- Un cambio de precio se hace con una fila nueva y fechas, sin borrar la anterior.
alter table planes_sistema
  add column if not exists vigente_desde date not null default date '2026-10-29',
  add column if not exists vigente_hasta date,
  add column if not exists iva_pct numeric(5,2) not null default 19 check (iva_pct >= 0),
  add column if not exists descripcion text,
  add column if not exists caracteristicas jsonb not null default '[]'::jsonb;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'planes_sistema_vigencia_check') then
    alter table planes_sistema
      add constraint planes_sistema_vigencia_check
      check (vigente_hasta is null or vigente_hasta >= vigente_desde);
  end if;
end $$;

-- Funciones incluidas en todos los planes (las 8 de la spec 30).
update planes_sistema
set iva_pct = 19,
    caracteristicas = '[
      {"titulo":"Membresía","detalle":"Fichas, planes, vencimientos, congelamientos, pases de prueba y grupos familiares."},
      {"titulo":"Calendario de clases","detalle":"Cupos, profesores, inscripción online."},
      {"titulo":"Pagos online","detalle":"Mercado Pago, transferencia con comprobante, desde el portal."},
      {"titulo":"Portal del socio","detalle":"Membresía, clases, rutinas y pagos; versión web adaptada a móviles."},
      {"titulo":"Nutrición","detalle":"Planes y recetas con macros automáticos; cada socio ve sus calorías del día y anota lo que come."},
      {"titulo":"Inscripción online","detalle":"Página pública con fotos y planes para que socios nuevos se registren solos."},
      {"titulo":"Usuarios y permisos","detalle":"Staff con permisos por módulo y bitácora de acciones."},
      {"titulo":"Carga masiva","detalle":"Importa socios y productos desde Excel."}
    ]'::jsonb
where nombre in ('Inicial', 'Crecimiento', 'Escala')
  and caracteristicas = '[]'::jsonb;

-- Lectura: autenticados (incluye planes ya vencidos, para el historial y el plan actual
-- de cada gimnasio; la vigencia se filtra en la consulta). Escritura: solo superadmin.
drop policy if exists "planes_sistema: escritura solo superadmin" on planes_sistema;
create policy "planes_sistema: escritura solo superadmin"
  on planes_sistema for all
  using (exists (select 1 from superadmins s where s.id = auth.uid()))
  with check (exists (select 1 from superadmins s where s.id = auth.uid()));

-- Solo se ofrecen planes vigentes a la fecha.
create or replace function plan_sistema_requerido(p_gimnasio_id uuid)
returns uuid
language sql
stable
as $$
  select ps.id
  from planes_sistema ps
  where ps.activo
    and ps.vigente_desde <= current_date
    and (ps.vigente_hasta is null or ps.vigente_hasta >= current_date)
    and (ps.max_alumnos is null
         or ps.max_alumnos >= (select count(*) from alumnos
                               where gimnasio_id = p_gimnasio_id and activo))
  order by ps.orden
  limit 1;
$$;

create or replace view v_uso_plan_sistema
with (security_invoker = true) as
select
  g.id as gimnasio_id,
  ps.nombre as plan_nombre,
  ps.max_alumnos,
  (select count(*) from alumnos a where a.gimnasio_id = g.id and a.activo) as alumnos_activos,
  (select s.nombre from planes_sistema s
   where s.activo and s.orden > ps.orden
     and s.vigente_desde <= current_date
     and (s.vigente_hasta is null or s.vigente_hasta >= current_date)
   order by s.orden limit 1) as plan_siguiente,
  ps.max_alumnos is not null
    and (select count(*) from alumnos a where a.gimnasio_id = g.id and a.activo)
        >= ceil(ps.max_alumnos * 0.8) as cerca_del_tope
from gimnasios g
join planes_sistema ps on ps.id = g.plan_sistema_id;
