-- Sprint 19, Parte 1: registro explícito de asistencia (presente/ausente/justificado)
-- desde la Bitácora — hoy la reserva solo sabe si sigue vigente, se canceló o "ya
-- pasó" (`estado`), sin dejar constancia de si el alumno realmente llegó. Columna
-- aditiva y nullable: no reemplaza `estado`, que sigue gobernando cupos y el flujo
-- de cancelación/reprogramación existente (Sprint 8) sin cambios.
--
-- Regla de negocio nueva (auditoría UX 2026-09-04, sección 4): "ausente" y
-- "justificado" NO deben descontar una clase del paquete; "presente" sí. Como
-- `consumir_clase_paquete` (migración 0007) sigue disparando solo cuando `estado`
-- pasa a 'realizada', la función `marcarAsistencia` (app/protected/bitacora/actions.ts)
-- logra esto sin tocar ese trigger: para "presente" actualiza `estado` a 'realizada'
-- (consume la clase, comportamiento sin cambios); para "ausente"/"justificado" solo
-- graba `asistencia`, dejando `estado` en 'reservada' (no dispara el trigger).
create type asistencia_reserva as enum ('presente', 'ausente', 'justificado');

alter table reservas add column asistencia asistencia_reserva;
