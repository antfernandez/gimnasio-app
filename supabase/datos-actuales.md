# Datos ingresados — snapshot

> Consulta directa a la base de datos del proyecto Supabase `wslzbejanltdnsbqcfvj` el 2026-08-21. Esto es un **volcado puntual** (no se actualiza solo); para ver el estado real, volver a correr la consulta. Es un dataset de prueba/QA — 2 gimnasios, 2 alumnos.

## Resumen por tabla

| Tabla | Filas |
|---|---|
| gimnasios | 2 |
| perfiles | 2 |
| alumnos | 2 |
| pagos | 2 |
| rutinas | 3 |
| avances | 0 |
| members | 0 |

## `gimnasios`

| id | nombre | plan | estado | fecha_inicio_plan | created_at |
|---|---|---|---|---|---|
| `b372eb30-…debef` | Gimnasio Test QA | prueba | activo | 2026-08-20 | 2026-08-20 03:19:14 UTC |
| `9c0d2d10-…545bb` | Gimnasio Demo | prueba | activo | 2026-08-21 | 2026-08-21 02:22:39 UTC |

Son dos tenants distintos creados en días consecutivos — parecen dos pruebas de alta de gimnasio (flujo `Alta de gimnasio`), no datos de producción real todavía.

## `perfiles`

| id | gimnasio_id | nombre_completo | rol | created_at |
|---|---|---|---|---|
| `58e3e3eb-…50fd2` | Gimnasio Test QA | Antonio QA | dueño | 2026-08-20 03:19:14 UTC |
| `7fdd58d0-…e93b1` | Gimnasio Demo | Antonio Fernandez | dueño | 2026-08-21 02:22:39 UTC |

Un dueño por gimnasio, ambos creados por el mismo usuario (pruebas propias). Ningún perfil con rol `entrenador` todavía.

## `alumnos`

| nombres | apellidos | rut | email | teléfono | plan | activo | gimnasio |
|---|---|---|---|---|---|---|---|
| Camila Andrea | Jara Cordero | 23.055.669-5 | camila@jara.cl | +56966104763 | Mensual | sí | Gimnasio Test QA |
| Daniella Loreto | Muñoz Rodriguez | 16.490.383-4 | daniellamunoz.rod@gmail.com | +56988396907 | Mensual | sí | Gimnasio Demo |

Un alumno por gimnasio. Ambos con plan "Mensual" y activos.

## `pagos` (ambos de la alumna Daniella Loreto, Gimnasio Demo)

| monto | fecha_pago | método | periodo | created_at |
|---|---|---|---|---|
| $20.000 | 2026-08-21 | efectivo | 2026-08-21 → 2026-09-20 | 03:08... |
| $30.000 | 2026-08-21 | tarjeta | 2026-08-21 → 2026-09-20 | 03:08... |

⚠️ Dos pagos con **el mismo período** (2026-08-21 → 2026-09-20) para la misma alumna, con montos distintos ($20.000 y $30.000) y métodos distintos. No hay constraint que impida esto — probablemente es una prueba de doble registro durante QA, pero conviene revisar si es un duplicado real o dos abonos parciales intencionales. El alumno de "Gimnasio Test QA" (Camila) no tiene ningún pago registrado → según la vista `v_estado_pago_alumnos`, su `estado_pago` sería `sin_pagos`.

## `rutinas` (las 3 pertenecen a Daniella Loreto, Gimnasio Demo)

| nombre | activa | fecha_asignacion | contenido |
|---|---|---|---|
| Rutina fuerza — nivel 1 | no | 2026-08-21 | Sentadilla (4x12), Press de banca (3x10) |
| Rutina hipertrofia — nivel 2 | no | 2026-08-21 | Peso muerto (0x0 — series/reps en 0) |
| Rutina cardio | **sí** | 2026-08-21 | Bicicleta estática (1x1, "20 minutos"), Burpies (3x10) |

Solo "Rutina cardio" está marcada como activa; las otras dos quedaron inactivas (probablemente reemplazadas durante pruebas). "Rutina hipertrofia — nivel 2" tiene series/reps en 0, luce como un registro de prueba incompleto. Ningún alumno de "Gimnasio Test QA" tiene rutinas.

## `avances` — vacía (0 filas)

Ningún gimnasio ha registrado seguimiento de peso/medidas todavía.

## `members` — vacía (0 filas)

Tabla sin uso (ver nota de drift en `modelo-tablas.md`).
