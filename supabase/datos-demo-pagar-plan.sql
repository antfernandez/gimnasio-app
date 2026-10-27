-- Datos INVENTADOS para avanzar con la Spec 23 mientras se definen tramos, precios y
-- cuentas reales. Correr después de la migración 0021 y reemplazar antes de producción.

insert into planes_sistema (nombre, max_alumnos, precio_mensual, orden) values
  ('Inicial',     30,   19990, 1),
  ('Crecimiento', 100,  39990, 2),
  ('Pro',         null, 69990, 3);

-- Cuenta del sistema (Antonio): gimnasio_id null.
insert into cuentas_transferencia
  (gimnasio_id, banco, tipo_cuenta, numero_cuenta, titular, rut_titular, email_contacto)
values
  (null, 'Banco de Chile', 'Cuenta corriente', '00-123-45678-90',
   'Antonio Fernandez', '12.345.678-5', 'pagos@ejemplo.cl');

-- Cuenta de cada gimnasio existente (demo).
insert into cuentas_transferencia
  (gimnasio_id, banco, tipo_cuenta, numero_cuenta, titular, rut_titular, email_contacto)
select id, 'BancoEstado', 'Cuenta Vista', '123456789012', nombre, '76.123.456-7', 'contacto@ejemplo.cl'
from gimnasios;

-- Suscripción vigente de prueba: plan Inicial hasta fin del mes en curso.
update gimnasios
set plan_sistema_id = (select id from planes_sistema where nombre = 'Inicial'),
    suscripcion_hasta = (date_trunc('month', current_date) + interval '1 month - 1 day')::date;
