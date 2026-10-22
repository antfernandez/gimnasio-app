-- Spec 01 (cobranza y panel del dueño), R1: fuente única de verdad para "¿quién me
-- debe?". Hasta ahora el listado de Pagos leía `v_estado_pago_alumnos` (último
-- `pagos.periodo_hasta`) y el panel "Hoy" leía `v_estado_paquetes_alumnos` (ciclo de
-- clases), así que un alumno podía verse atrasado en una pantalla y al día en otra.
--
-- Regla conciliada (pendiente de validar con la dueña, ver spec §6, pregunta 1): el
-- vencimiento efectivo de un alumno es el MÁS TARDÍO entre su último pago y su último
-- paquete; solo está "atrasado" si ambos ya vencieron. Las vistas anteriores se
-- mantienen (las usa el portal del alumno), pero el panel del dueño lee solo esta.
--
-- `security_invoker`: la vista corre con los permisos (y por lo tanto el RLS) de quien
-- consulta, igual que las tablas base — no reabre el tipo de incidente de la 0012.
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
  end as dias_atraso
from base;
