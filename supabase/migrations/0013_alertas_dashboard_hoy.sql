-- Sprint 18, Parte 5: distingue "atrasado" (tuvo un paquete y venció, sin
-- renovar) de "sin_paquete" (nunca compró uno, típicamente alumno de prueba) en
-- v_estado_paquetes_alumnos. Antes ambos caían en 'sin_paquete', que el Dashboard
-- necesita separar para poder listar de verdad "atrasados" y "por vencer en los
-- próximos 7 días" (auditoría UX 2026-09-04, punto 3.4).
create or replace view v_estado_paquetes_alumnos as
with paquete_vigente as (
  select distinct on (alumno_id)
    alumno_id, id, clases_incluidas, clases_consumidas, fecha_inicio, fecha_vencimiento
  from paquetes
  where current_date between fecha_inicio and fecha_vencimiento
  order by alumno_id, fecha_vencimiento asc
),
ultimo_paquete as (
  select distinct on (alumno_id)
    alumno_id, fecha_vencimiento as ultimo_vencimiento
  from paquetes
  order by alumno_id, fecha_vencimiento desc
)
select
  a.id as alumno_id,
  a.gimnasio_id,
  a.nombres,
  a.apellidos,
  a.activo,
  pv.id as paquete_id,
  pv.clases_incluidas,
  pv.clases_consumidas,
  (pv.clases_incluidas - pv.clases_consumidas) as clases_restantes,
  pv.fecha_inicio,
  coalesce(pv.fecha_vencimiento, up.ultimo_vencimiento) as vencimiento_actual,
  case
    when pv.id is not null and pv.fecha_vencimiento <= current_date + 7 then 'por_vencer'
    when pv.id is not null then 'vigente'
    when up.ultimo_vencimiento is not null then 'atrasado'
    else 'sin_paquete'
  end as estado_paquete
from alumnos a
left join paquete_vigente pv on pv.alumno_id = a.id
left join ultimo_paquete up on up.alumno_id = a.id;
