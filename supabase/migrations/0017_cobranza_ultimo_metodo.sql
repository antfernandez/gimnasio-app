-- Spec 09: método de pago del último pago del alumno en la vista de cobranza, para
-- mostrarlo en la grilla de Pagos sin una query adicional. Las columnas nuevas de
-- `create or replace view` solo pueden ir al final, así que se une en el select final.
create or replace view v_estado_cobranza_alumnos
with (security_invoker = true) as
with pago as (
  select alumno_id, max(periodo_hasta) as vencimiento
  from pagos
  group by alumno_id
),
paq as (
  select alumno_id, max(fecha_vencimiento) as vencimiento
  from paquetes
  group by alumno_id
),
ultimo as (
  select distinct on (alumno_id) alumno_id, metodo
  from pagos
  order by alumno_id, fecha_pago desc, created_at desc
),
base as (
  select
    a.id as alumno_id,
    a.gimnasio_id,
    a.nombres,
    a.apellidos,
    a.telefono,
    a.activo,
    a.plan_id,
    pl.nombre as plan_nombre,
    pl.precio as plan_precio,
    greatest(pago.vencimiento, paq.vencimiento) as vencimiento_actual
  from alumnos a
  left join planes pl on pl.id = a.plan_id
  left join pago on pago.alumno_id = a.id
  left join paq on paq.alumno_id = a.id
)
select
  base.*,
  case
    when vencimiento_actual is null then 'sin_pagos'
    when vencimiento_actual < current_date then 'atrasado'
    when vencimiento_actual <= current_date + 7 then 'por_vencer'
    else 'al_dia'
  end as estado_pago,
  case
    when vencimiento_actual < current_date then current_date - vencimiento_actual
    else 0
  end as dias_atraso,
  ultimo.metodo as ultimo_metodo
from base
left join ultimo on ultimo.alumno_id = base.alumno_id;
