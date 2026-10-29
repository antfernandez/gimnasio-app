-- Spec 30: planes del sistema Inicial / Crecimiento / Escala (precio neto, + IVA).
-- Reemplaza los tramos provisorios de la 0021. Los precios con IVA se calculan en
-- lib/planes-sistema.ts; aquí `precio_mensual` guarda el neto.
update planes_sistema set nombre = 'Escala' where nombre = 'Pro';

update planes_sistema set max_alumnos = 150, precio_mensual = 29990, orden = 1 where nombre = 'Inicial';
update planes_sistema set max_alumnos = 300, precio_mensual = 49990, orden = 2 where nombre = 'Crecimiento';
update planes_sistema set max_alumnos = 450, precio_mensual = 69990, orden = 3 where nombre = 'Escala';

insert into planes_sistema (nombre, max_alumnos, precio_mensual, orden)
select v.nombre, v.max_alumnos, v.precio_mensual, v.orden
from (values
  ('Inicial', 150, 29990, 1),
  ('Crecimiento', 300, 49990, 2),
  ('Escala', 450, 69990, 3)
) as v(nombre, max_alumnos, precio_mensual, orden)
where not exists (select 1 from planes_sistema p where p.nombre = v.nombre);

-- Gimnasios sin plan asignado parten en Inicial.
update gimnasios
set plan_sistema_id = (select id from planes_sistema where nombre = 'Inicial')
where plan_sistema_id is null;
