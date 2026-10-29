-- Spec 47: el superadmin registra pagos de suscripción manuales (efectivo, depósito, etc.).
-- Se agrega el método `manual`; no lleva comprobante ni fecha de transferencia.
alter type metodo_solicitud add value if not exists 'manual';

-- La restricción se reescribe comparando `metodo::text` porque un valor de enum recién
-- agregado no puede usarse en la misma transacción.
alter table solicitudes_pago drop constraint if exists solicitudes_pago_transferencia_ck;
alter table solicitudes_pago add constraint solicitudes_pago_transferencia_ck check (
  (metodo::text = 'transferencia' and comprobante_path is not null
     and fecha_transferencia is not null and fecha_transferencia <= current_date + 1)
  or (metodo::text = 'mercado_pago' and comprobante_path is null)
  or (metodo::text = 'manual' and flujo = 'suscripcion' and comprobante_path is null)
);
