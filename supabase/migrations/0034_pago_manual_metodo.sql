-- Spec 49: el pago registrado por el superadmin indica si fue Transferencia o Mercado Pago.
-- Se marca con `registro_manual` (sin comprobante ni fecha de transferencia); el valor de enum
-- `manual` (0033) queda solo para filas ya creadas.
alter table solicitudes_pago
  add column if not exists registro_manual boolean not null default false;

alter table solicitudes_pago drop constraint if exists solicitudes_pago_transferencia_ck;
alter table solicitudes_pago add constraint solicitudes_pago_transferencia_ck check (
  (registro_manual and flujo = 'suscripcion' and comprobante_path is null
     and metodo::text in ('transferencia', 'mercado_pago'))
  or (metodo::text = 'transferencia' and comprobante_path is not null
     and fecha_transferencia is not null and fecha_transferencia <= current_date + 1)
  or (metodo::text = 'mercado_pago' and comprobante_path is null)
  or (metodo::text = 'manual' and flujo = 'suscripcion' and comprobante_path is null)
);
