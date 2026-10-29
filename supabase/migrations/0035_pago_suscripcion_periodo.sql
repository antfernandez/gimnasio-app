-- Spec 49: el pago manual de suscripción indica el mes que se paga (primer mes cubierto).
-- Primer día del mes; null en pagos anteriores o por transferencia/Mercado Pago del dueño.
alter table solicitudes_pago
  add column if not exists periodo_desde date;
