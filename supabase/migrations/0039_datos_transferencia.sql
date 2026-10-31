-- Specs 54 y 56: datos bancarios reales para transferir.
-- Cuenta del sistema (gimnasio_id null): suscripción del dueño al sistema.
update cuentas_transferencia
set titular = 'Antonio Fernández Acevedo',
    rut_titular = '16800755-8',
    banco = 'Scotiabank',
    tipo_cuenta = 'Cuenta Corriente',
    numero_cuenta = '250080776',
    email_contacto = 'antonio.fernandezacevedo@gmail.com'
where gimnasio_id is null;

insert into cuentas_transferencia
  (gimnasio_id, banco, tipo_cuenta, numero_cuenta, titular, rut_titular, email_contacto)
select null, 'Scotiabank', 'Cuenta Corriente', '250080776',
       'Antonio Fernández Acevedo', '16800755-8', 'antonio.fernandezacevedo@gmail.com'
where not exists (select 1 from cuentas_transferencia where gimnasio_id is null);

-- Cuenta del gimnasio (alumno → gimnasio): solo las filas que aún tienen los datos demo
-- de `supabase/datos-demo-pagar-plan.sql`; no pisa cuentas que un gimnasio ya configuró.
update cuentas_transferencia
set titular = 'Flavia Reyes',
    rut_titular = '78049545-6',
    banco = 'Banco Estado',
    tipo_cuenta = 'Cuenta Corriente',
    numero_cuenta = '5670106651',
    email_contacto = 'flaviaanahata@gmail.com'
where gimnasio_id is not null
  and numero_cuenta = '123456789012'
  and banco = 'BancoEstado';
