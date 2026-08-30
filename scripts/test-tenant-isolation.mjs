#!/usr/bin/env node
// Sprint 5: suite repeatable de aislamiento multi-tenant. Reemplaza el script ad-hoc
// mencionado en sprint-5-multitenancy-landing.md por uno versionado y re-ejecutable —
// base para formalizarlo en CI en el Sprint 8.
//
// Qué hace: crea dos gimnasios de prueba (Tenant A y Tenant B), cada uno con su propio
// usuario autenticado, alumno, pago, rutina y avance, y verifica que el cliente de un
// tenant no pueda leer, actualizar ni borrar los datos del otro en ninguna de las seis
// tablas del modelo (gimnasios, perfiles, alumnos, pagos, rutinas, avances). Además
// (Sprint 6) crea un usuario-alumno vinculado al Tenant A y verifica que el rol Alumno
// solo vea/edite su propia ficha, no la de otro alumno del mismo gimnasio ni la de otro
// tenant, que el trigger de columnas protegidas bloquee editar rut/plan/activo (solo
// contacto), y que el registro de avances propios respete el flag
// `puede_registrar_avances`. Además (Sprint 7) verifica el CMS: la RPC pública
// `obtener_sitio_publico` solo expone lo publicado (nunca un borrador más nuevo ni el
// sitio de un gimnasio que no ha publicado nada), el Tenant B no puede leer ni escribir
// `sitios`/`sitio_versiones` del Tenant A directo, y las políticas de Storage del
// bucket `sitio-imagenes` permiten subir solo dentro de la propia carpeta. Además
// (Sprint 8) crea horarios y reservas de prueba y verifica que el Tenant B no pueda
// leer/escribir `horarios_disponibles`/`reservas` del Tenant A ni sus RPCs
// (`turnos_disponibilidad`, `reprogramar_reserva`), que un alumno no vea ni pueda tocar
// la reserva de OTRO alumno de su propio gimnasio, que el trigger de cupos bloquee un
// sobrecupo incluso con la service_role key, y que un alumno cancelando su propia
// reserva no pueda fabricar el resultado de la ventana de 24 h ni tocar otra columna
// de paso. Al final borra todo lo que creó (incluidos los objetos de Storage subidos),
// sin importar si las pruebas pasaron o fallaron.
//
// Requiere:
//   - NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (ya están en
//     .env.local) para autenticar como cada usuario de prueba igual que la app real.
//   - SUPABASE_SERVICE_ROLE_KEY (Project Settings → API → service_role, NO la
//     publishable/anon) para poder crear usuarios ya confirmados (sin pasar por el
//     correo de confirmación) y para la limpieza final, que debe poder borrar sin
//     toparse con las mismas políticas RLS que este script está probando. Agrégala a
//     `.env.local` (gitignored) — nunca la subas al repo ni la publiques en el
//     frontend, es una clave de administrador que se salta RLS por completo.
//
// Uso:
//   node scripts/test-tenant-isolation.mjs
//
// Corre contra el proyecto Supabase real (no hay uno de staging separado para este
// proyecto todavía) — crea datos reales de prueba y los borra al terminar.

import { readFileSync, existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

function loadEnvLocal() {
  const path = new URL("../.env.local", import.meta.url);
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2].trim();
    }
  }
}
loadEnvLocal();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !ANON_KEY || !SERVICE_ROLE_KEY) {
  console.error(
    "Faltan variables de entorno. Se requieren NEXT_PUBLIC_SUPABASE_URL, " +
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY y SUPABASE_SERVICE_ROLE_KEY " +
      "(esta última agrégala a .env.local, no está ahí por defecto).",
  );
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const results = [];
function record(label, ok, detail) {
  results.push({ label, ok, detail });
  console.log(`${ok ? "✅" : "❌"} ${label}${detail ? ` — ${detail}` : ""}`);
}

/** Crea un usuario ya confirmado + su gimnasio/perfil, igual que `ensureGymProfile`
 * (lib/perfil.ts) pero manejado desde el script en vez de disparado por el primer
 * login de la app. `trackUser`/`trackGimnasio` se llaman apenas cada recurso se crea
 * (no al final) para que la limpieza pueda borrar lo que sí alcanzó a crearse aunque
 * un paso posterior falle. */
async function createTenant(label, trackUser, trackGimnasio) {
  const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const email = `isolation-test-${label}-${runId}@example.com`;
  const password = `Test-${runId}-Aa1!`;

  const { data: userData, error: userError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (userError || !userData.user) {
    throw new Error(`No se pudo crear el usuario ${label}: ${userError?.message}`);
  }
  trackUser(userData.user.id);

  const client = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error: signInError } = await client.auth.signInWithPassword({ email, password });
  if (signInError) {
    throw new Error(`No se pudo iniciar sesión como ${label}: ${signInError.message}`);
  }

  const gimnasioId = crypto.randomUUID();
  const slug = `isolation-test-${label.toLowerCase()}-${runId}`;
  const { error: gimError } = await client
    .from("gimnasios")
    .insert({ id: gimnasioId, nombre: `Gimnasio de prueba ${label}`, slug });
  if (gimError) throw new Error(`No se pudo crear el gimnasio ${label}: ${gimError.message}`);
  trackGimnasio(gimnasioId);

  const { error: perfilError } = await client
    .from("perfiles")
    .insert({ id: userData.user.id, gimnasio_id: gimnasioId, nombre_completo: `Dueño ${label}`, rol: "dueño" });
  if (perfilError) throw new Error(`No se pudo crear el perfil ${label}: ${perfilError.message}`);

  const alumnoId = crypto.randomUUID();
  const { error: alumnoError } = await client.from("alumnos").insert({
    id: alumnoId,
    gimnasio_id: gimnasioId,
    rut: Math.floor(10000000 + Math.random() * 8000000),
    dig_ver: "5",
    nombres: `Alumno ${label}`,
    apellidos: "Prueba",
    plan_contratado: "mensual",
  });
  if (alumnoError) throw new Error(`No se pudo crear el alumno ${label}: ${alumnoError.message}`);

  const { data: pago, error: pagoError } = await client
    .from("pagos")
    .insert({
      gimnasio_id: gimnasioId,
      alumno_id: alumnoId,
      monto: 10000,
      periodo_desde: "2026-01-01",
      periodo_hasta: "2026-01-31",
    })
    .select()
    .single();
  if (pagoError) throw new Error(`No se pudo crear el pago ${label}: ${pagoError.message}`);

  const { data: rutina, error: rutinaError } = await client
    .from("rutinas")
    .insert({ gimnasio_id: gimnasioId, alumno_id: alumnoId, nombre: `Rutina ${label}` })
    .select()
    .single();
  if (rutinaError) throw new Error(`No se pudo crear la rutina ${label}: ${rutinaError.message}`);

  const { data: avance, error: avanceError } = await client
    .from("avances")
    .insert({ gimnasio_id: gimnasioId, alumno_id: alumnoId, peso_kg: 70 })
    .select()
    .single();
  if (avanceError) throw new Error(`No se pudo crear el avance ${label}: ${avanceError.message}`);

  return {
    label,
    userId: userData.user.id,
    client,
    gimnasioId,
    slug,
    alumnoId,
    pagoId: pago.id,
    rutinaId: rutina.id,
    avanceId: avance.id,
  };
}

/** Corre las verificaciones de aislamiento del punto de vista de `attacker` intentando
 * leer/modificar/borrar los datos de `victim`. */
async function assertIsolation(attacker, victim) {
  const prefix = `${attacker.label} → datos de ${victim.label}`;

  const { data: gimRead } = await attacker.client
    .from("gimnasios")
    .select("id")
    .eq("id", victim.gimnasioId);
  record(`${prefix}: SELECT gimnasios`, (gimRead?.length ?? 0) === 0, `filas visibles: ${gimRead?.length ?? 0}`);

  const { data: perfilRead } = await attacker.client
    .from("perfiles")
    .select("id")
    .eq("id", victim.userId);
  record(`${prefix}: SELECT perfiles`, (perfilRead?.length ?? 0) === 0, `filas visibles: ${perfilRead?.length ?? 0}`);

  const { data: alumnoRead } = await attacker.client
    .from("alumnos")
    .select("id")
    .eq("id", victim.alumnoId);
  record(`${prefix}: SELECT alumnos`, (alumnoRead?.length ?? 0) === 0, `filas visibles: ${alumnoRead?.length ?? 0}`);

  const { data: pagoRead } = await attacker.client.from("pagos").select("id").eq("id", victim.pagoId);
  record(`${prefix}: SELECT pagos`, (pagoRead?.length ?? 0) === 0, `filas visibles: ${pagoRead?.length ?? 0}`);

  const { data: rutinaRead } = await attacker.client.from("rutinas").select("id").eq("id", victim.rutinaId);
  record(`${prefix}: SELECT rutinas`, (rutinaRead?.length ?? 0) === 0, `filas visibles: ${rutinaRead?.length ?? 0}`);

  const { data: avanceRead } = await attacker.client.from("avances").select("id").eq("id", victim.avanceId);
  record(`${prefix}: SELECT avances`, (avanceRead?.length ?? 0) === 0, `filas visibles: ${avanceRead?.length ?? 0}`);

  const { data: gimUpdate } = await attacker.client
    .from("gimnasios")
    .update({ nombre: "hackeado" })
    .eq("id", victim.gimnasioId)
    .select();
  record(`${prefix}: UPDATE gimnasios`, (gimUpdate?.length ?? 0) === 0, `filas afectadas: ${gimUpdate?.length ?? 0}`);

  const { data: alumnoUpdate } = await attacker.client
    .from("alumnos")
    .update({ nombres: "hackeado" })
    .eq("id", victim.alumnoId)
    .select();
  record(`${prefix}: UPDATE alumnos`, (alumnoUpdate?.length ?? 0) === 0, `filas afectadas: ${alumnoUpdate?.length ?? 0}`);

  const { data: alumnoDelete } = await attacker.client
    .from("alumnos")
    .delete()
    .eq("id", victim.alumnoId)
    .select();
  record(`${prefix}: DELETE alumnos`, (alumnoDelete?.length ?? 0) === 0, `filas borradas: ${alumnoDelete?.length ?? 0}`);

  // No es una lectura cruzada, sino un chequeo de integridad: RLS en `pagos` solo
  // exige que `gimnasio_id` sea del propio tenant, no que `alumno_id` pertenezca a
  // ese mismo gimnasio. Si esto pasa, un dueño podría enlazar un pago propio a un
  // alumno ajeno (no ve los datos de la víctima, pero contaminaría su propia tabla
  // con una referencia cruzada).
  const { data: crossInsert } = await attacker.client
    .from("pagos")
    .insert({
      gimnasio_id: attacker.gimnasioId,
      alumno_id: victim.alumnoId,
      monto: 1,
      periodo_desde: "2026-01-01",
      periodo_hasta: "2026-01-31",
    })
    .select();
  record(
    `${prefix}: INSERT pagos con alumno_id ajeno`,
    (crossInsert?.length ?? 0) === 0,
    (crossInsert?.length ?? 0) > 0
      ? "riesgo de integridad: no hay constraint que impida referenciar un alumno de otro gimnasio"
      : undefined,
  );
  if (crossInsert && crossInsert.length > 0) {
    await admin.from("pagos").delete().eq("id", crossInsert[0].id);
  }
}

/** Sprint 6: crea un usuario-alumno vinculado a `tenant` (mismo patrón que
 * `ensureAlumnoLink`, lib/alumno-portal.ts, pero disparado a mano igual que
 * `createTenant` hace con el dueño) y un segundo alumno del mismo gimnasio sin
 * cuenta propia (dado de alta por el dueño, como en los Sprints 0-5), para
 * verificar que el rol Alumno nuevo del Sprint 6 no gane acceso de más ni
 * dentro de su propio gimnasio ni fuera de él. */
async function createAlumnoUser(tenant, trackUser) {
  const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const email = `isolation-test-alumno-${runId}@example.com`;
  const password = `Test-${runId}-Aa1!`;

  const { data: userData, error: userError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (userError || !userData.user) {
    throw new Error(`No se pudo crear el usuario alumno: ${userError?.message}`);
  }
  trackUser(userData.user.id);

  const client = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error: signInError } = await client.auth.signInWithPassword({ email, password });
  if (signInError) {
    throw new Error(`No se pudo iniciar sesión como alumno: ${signInError.message}`);
  }

  const { data: alumno, error: alumnoError } = await client
    .from("alumnos")
    .insert({
      user_id: userData.user.id,
      gimnasio_id: tenant.gimnasioId,
      rut: Math.floor(10000000 + Math.random() * 8000000),
      dig_ver: "5",
      nombres: "Alumno con cuenta",
      apellidos: "Prueba",
      plan_contratado: "mensual",
    })
    .select()
    .single();
  if (alumnoError || !alumno) {
    throw new Error(`No se pudo vincular el alumno (INSERT propio vía RLS): ${alumnoError?.message}`);
  }

  const { data: otroAlumno, error: otroError } = await admin
    .from("alumnos")
    .insert({
      gimnasio_id: tenant.gimnasioId,
      rut: Math.floor(10000000 + Math.random() * 8000000),
      dig_ver: "5",
      nombres: "Otro alumno del mismo gimnasio",
      apellidos: "Sin cuenta",
      plan_contratado: "mensual",
    })
    .select()
    .single();
  if (otroError || !otroAlumno) {
    throw new Error(`No se pudo crear el otro alumno del gimnasio: ${otroError?.message}`);
  }

  return { userId: userData.user.id, client, alumnoId: alumno.id, otroAlumnoId: otroAlumno.id };
}

/** Verificaciones de aislamiento propias del rol Alumno (Sprint 6): acceso a la
 * ficha propia, bloqueo de columnas protegidas, y que no gane ni el acceso de
 * dueño/entrenador dentro de su propio gimnasio ni acceso cruzado a `tenantB`. */
async function assertAlumnoIsolation(alumno, tenantA, tenantB) {
  const { data: propia } = await alumno.client
    .from("alumnos")
    .select("*")
    .eq("id", alumno.alumnoId);
  record("alumno: SELECT ficha propia", (propia?.length ?? 0) === 1, `filas visibles: ${propia?.length ?? 0}`);

  const { data: gimPropio } = await alumno.client
    .from("gimnasios")
    .select("id")
    .eq("id", tenantA.gimnasioId);
  record("alumno: SELECT gimnasio propio", (gimPropio?.length ?? 0) === 1, `filas visibles: ${gimPropio?.length ?? 0}`);

  const { data: otroEnMismoGym } = await alumno.client
    .from("alumnos")
    .select("id")
    .eq("id", alumno.otroAlumnoId);
  record(
    "alumno: SELECT otro alumno del mismo gimnasio",
    (otroEnMismoGym?.length ?? 0) === 0,
    `filas visibles: ${otroEnMismoGym?.length ?? 0} (no debe heredar acceso de dueño/entrenador)`,
  );

  const { data: victimaAlumno } = await alumno.client
    .from("alumnos")
    .select("id")
    .eq("id", tenantB.alumnoId);
  record("alumno: SELECT alumno de otro tenant", (victimaAlumno?.length ?? 0) === 0, `filas visibles: ${victimaAlumno?.length ?? 0}`);

  const { data: victimaGim } = await alumno.client
    .from("gimnasios")
    .select("id")
    .eq("id", tenantB.gimnasioId);
  record("alumno: SELECT gimnasio de otro tenant", (victimaGim?.length ?? 0) === 0, `filas visibles: ${victimaGim?.length ?? 0}`);

  const { data: telUpdate, error: telError } = await alumno.client
    .from("alumnos")
    .update({ telefono: "+56911111111" })
    .eq("id", alumno.alumnoId)
    .select();
  record(
    "alumno: UPDATE teléfono propio (permitido)",
    !telError && (telUpdate?.length ?? 0) === 1,
    telError?.message,
  );

  const { error: rutError } = await alumno.client
    .from("alumnos")
    .update({ rut: 1111111 })
    .eq("id", alumno.alumnoId);
  record("alumno: UPDATE rut propio (bloqueado por trigger)", !!rutError, rutError?.message);

  const { error: activoError } = await alumno.client
    .from("alumnos")
    .update({ activo: false })
    .eq("id", alumno.alumnoId);
  record("alumno: UPDATE activo propio (bloqueado por trigger)", !!activoError, activoError?.message);

  const { data: otroUpdate } = await alumno.client
    .from("alumnos")
    .update({ telefono: "hackeado" })
    .eq("id", alumno.otroAlumnoId)
    .select();
  record(
    "alumno: UPDATE otro alumno del mismo gimnasio",
    (otroUpdate?.length ?? 0) === 0,
    `filas afectadas: ${otroUpdate?.length ?? 0}`,
  );

  const { data: avanceBloqueado } = await alumno.client
    .from("avances")
    .insert({ gimnasio_id: tenantA.gimnasioId, alumno_id: alumno.alumnoId, peso_kg: 70 })
    .select();
  record(
    "alumno: INSERT avance propio sin habilitar (bloqueado)",
    (avanceBloqueado?.length ?? 0) === 0,
    `filas insertadas: ${avanceBloqueado?.length ?? 0}`,
  );

  const { error: habilitarError } = await admin
    .from("alumnos")
    .update({ puede_registrar_avances: true })
    .eq("id", alumno.alumnoId);
  if (habilitarError) throw new Error(`No se pudo habilitar avances propios: ${habilitarError.message}`);

  const { data: avancePermitido } = await alumno.client
    .from("avances")
    .insert({ gimnasio_id: tenantA.gimnasioId, alumno_id: alumno.alumnoId, peso_kg: 70 })
    .select();
  record(
    "alumno: INSERT avance propio habilitado (permitido)",
    (avancePermitido?.length ?? 0) === 1,
    `filas insertadas: ${avancePermitido?.length ?? 0}`,
  );

  const { data: avanceAjeno } = await alumno.client
    .from("avances")
    .insert({ gimnasio_id: tenantA.gimnasioId, alumno_id: alumno.otroAlumnoId, peso_kg: 70 })
    .select();
  record(
    "alumno: INSERT avance a nombre de otro alumno (bloqueado)",
    (avanceAjeno?.length ?? 0) === 0,
    `filas insertadas: ${avanceAjeno?.length ?? 0}`,
  );
}

/** Sprint 7: crea el sitio del Tenant A (simula lo que hace `ensureSitio`,
 * lib/sitio-actual.ts, en el primer login), publica un contenido y verifica que (a) el
 * Tenant B no pueda leer/escribir `sitios`/`sitio_versiones` del Tenant A directo, (b)
 * la función pública `obtener_sitio_publico` solo devuelva lo publicado — nunca un
 * borrador más nuevo — y no exista para gimnasios sin publicar, y (c) las políticas de
 * Storage del bucket `sitio-imagenes` dejen subir solo dentro de la propia carpeta
 * (`${gimnasio_id}/...`) aunque la lectura sea pública. Borra los objetos de Storage
 * que suba (no se limpian solos con el `delete` en cascada de `gimnasios`). */
async function assertCmsIsolation(tenantA, tenantB) {
  const { error: crearSitioError } = await tenantA.client
    .from("sitios")
    .insert({ gimnasio_id: tenantA.gimnasioId, contenido_borrador: { hero: { titulo: "Borrador A" } } });
  if (crearSitioError) throw new Error(`No se pudo crear el sitio de A: ${crearSitioError.message}`);

  const { data: sitioSinPublicar } = await admin.rpc("obtener_sitio_publico", { p_slug: tenantA.slug });
  record(
    "sitio: RPC pública antes de publicar (no debe devolver nada)",
    (sitioSinPublicar?.length ?? 0) === 0,
    `filas: ${sitioSinPublicar?.length ?? 0}`,
  );

  const { error: publicarError } = await tenantA.client
    .from("sitios")
    .update({
      contenido_publicado: { hero: { titulo: "Publicado A" } },
      publicado_at: new Date().toISOString(),
    })
    .eq("gimnasio_id", tenantA.gimnasioId);
  if (publicarError) throw new Error(`No se pudo publicar el sitio de A: ${publicarError.message}`);

  // Cambia el borrador DESPUÉS de publicar — si la RPC pública devolviera esto en vez
  // de lo publicado, sería una fuga de contenido no revisado.
  await tenantA.client
    .from("sitios")
    .update({ contenido_borrador: { hero: { titulo: "Borrador A cambiado tras publicar" } } })
    .eq("gimnasio_id", tenantA.gimnasioId);

  const { data: sitioPublico } = await tenantB.client.rpc("obtener_sitio_publico", { p_slug: tenantA.slug });
  const publico = sitioPublico?.[0];
  record(
    "sitio: RPC pública devuelve lo publicado, no el borrador",
    publico?.contenido?.hero?.titulo === "Publicado A",
    `título devuelto: ${publico?.contenido?.hero?.titulo}`,
  );

  const { data: sitioDirecto } = await tenantB.client
    .from("sitios")
    .select("gimnasio_id")
    .eq("gimnasio_id", tenantA.gimnasioId);
  record("sitio: B → SELECT directo a sitios de A", (sitioDirecto?.length ?? 0) === 0, `filas visibles: ${sitioDirecto?.length ?? 0}`);

  const { data: sitioUpdate } = await tenantB.client
    .from("sitios")
    .update({ tema: "claro" })
    .eq("gimnasio_id", tenantA.gimnasioId)
    .select();
  record("sitio: B → UPDATE sitios de A", (sitioUpdate?.length ?? 0) === 0, `filas afectadas: ${sitioUpdate?.length ?? 0}`);

  const { data: versionesA } = await tenantB.client
    .from("sitio_versiones")
    .select("id")
    .eq("gimnasio_id", tenantA.gimnasioId);
  record("sitio: B → SELECT sitio_versiones de A", (versionesA?.length ?? 0) === 0, `filas visibles: ${versionesA?.length ?? 0}`);

  const rutaAjena = `${tenantA.gimnasioId}/isolation-test-intruso.png`;
  const archivo = new Blob([new Uint8Array([137, 80, 78, 71])], { type: "image/png" });
  const { error: subidaAjenaError } = await tenantB.client.storage
    .from("sitio-imagenes")
    .upload(rutaAjena, archivo);
  record(
    "storage: B sube a la carpeta de A (bloqueado)",
    !!subidaAjenaError,
    subidaAjenaError?.message,
  );

  const rutaPropia = `${tenantA.gimnasioId}/isolation-test-propio.png`;
  const { error: subidaPropiaError } = await tenantA.client.storage
    .from("sitio-imagenes")
    .upload(rutaPropia, archivo);
  record("storage: A sube a su propia carpeta (permitido)", !subidaPropiaError, subidaPropiaError?.message);
  await admin.storage.from("sitio-imagenes").remove([rutaPropia]);
}

/** Sprint 8: turnos y reservas. Verifica que un tenant no pueda leer/escribir los
 * `horarios_disponibles`/`reservas` de otro, que un alumno no vea las reservas de OTRO
 * alumno de su propio gimnasio (mismo criterio de privacidad que ya aplica sobre
 * `alumnos`), que el trigger de cupos bloquee un sobrecupo incluso con la service_role
 * key (los triggers corren para cualquier rol, RLS no), que un alumno no pueda
 * fabricar el resultado de la ventana de 24 h ni tocar otra columna al "cancelar", y
 * que las RPCs (`turnos_disponibilidad`, `reprogramar_reserva`) respeten el mismo
 * aislamiento por gimnasio que las tablas. Reutiliza los fixtures ya creados por
 * `createTenant`/`createAlumnoUser` — no crea usuarios nuevos. */
async function assertTurnosIsolation(tenantA, tenantB, alumnoA) {
  // Fecha de prueba: siempre a más de 24h de "ahora", para que las cancelaciones de
  // este bloque queden dentro de la ventana salvo que se pruebe lo contrario.
  const fecha = new Date();
  fecha.setDate(fecha.getDate() + 3);
  const fechaIso = fecha.toISOString().slice(0, 10);
  const diaSemana = fecha.getUTCDay();

  const { data: horarioA, error: horarioAError } = await admin
    .from("horarios_disponibles")
    .insert({
      gimnasio_id: tenantA.gimnasioId,
      dia_semana: diaSemana,
      hora_inicio: "10:00",
      duracion_min: 90,
      cupos: 1,
    })
    .select()
    .single();
  if (horarioAError || !horarioA) {
    throw new Error(`No se pudo crear el horario de prueba (10:00): ${horarioAError?.message}`);
  }
  const { error: horarioA2Error } = await admin.from("horarios_disponibles").insert({
    gimnasio_id: tenantA.gimnasioId,
    dia_semana: diaSemana,
    hora_inicio: "11:30",
    duracion_min: 90,
    cupos: 2,
  });
  if (horarioA2Error) {
    throw new Error(`No se pudo crear el horario de prueba (11:30): ${horarioA2Error.message}`);
  }

  const { data: horarioLeidoPorB } = await tenantB.client
    .from("horarios_disponibles")
    .select("id")
    .eq("id", horarioA.id);
  record("turnos: B → SELECT horario de A", (horarioLeidoPorB?.length ?? 0) === 0, `filas visibles: ${horarioLeidoPorB?.length ?? 0}`);

  const { data: horarioUpdatePorB } = await tenantB.client
    .from("horarios_disponibles")
    .update({ cupos: 99 })
    .eq("id", horarioA.id)
    .select();
  record("turnos: B → UPDATE horario de A", (horarioUpdatePorB?.length ?? 0) === 0, `filas afectadas: ${horarioUpdatePorB?.length ?? 0}`);

  // A (dueño) reserva el único cupo del turno de las 10:00 a nombre de su alumno genérico.
  const { data: reservaA, error: reservaAError } = await tenantA.client
    .from("reservas")
    .insert({
      gimnasio_id: tenantA.gimnasioId,
      alumno_id: tenantA.alumnoId,
      fecha: fechaIso,
      hora_inicio: "10:00",
      duracion_min: 90,
      creado_por: "dueño",
    })
    .select()
    .single();
  if (reservaAError || !reservaA) {
    throw new Error(`No se pudo crear la reserva de A: ${reservaAError?.message}`);
  }

  // Cupo agotado: ni siquiera la service_role key (salta RLS, pero no triggers) puede
  // sumar una segunda reserva vigente al mismo turno de 1 cupo.
  const { error: sobrecupoError } = await admin.from("reservas").insert({
    gimnasio_id: tenantA.gimnasioId,
    alumno_id: alumnoA.otroAlumnoId,
    fecha: fechaIso,
    hora_inicio: "10:00",
    duracion_min: 90,
    creado_por: "dueño",
  });
  record(
    "turnos: cupo agotado bloquea una segunda reserva en el mismo turno",
    !!sobrecupoError,
    sobrecupoError?.message,
  );

  const { data: reservaLeidaPorB } = await tenantB.client
    .from("reservas")
    .select("id")
    .eq("id", reservaA.id);
  record("turnos: B → SELECT reserva de A", (reservaLeidaPorB?.length ?? 0) === 0, `filas visibles: ${reservaLeidaPorB?.length ?? 0}`);

  const { data: reservaUpdatePorB } = await tenantB.client
    .from("reservas")
    .update({ estado: "cancelada" })
    .eq("id", reservaA.id)
    .select();
  record("turnos: B → UPDATE (cancelar) reserva de A", (reservaUpdatePorB?.length ?? 0) === 0, `filas afectadas: ${reservaUpdatePorB?.length ?? 0}`);

  // Privacidad DENTRO del mismo gimnasio: el alumno con cuenta (Sprint 6) no ve la
  // reserva de OTRO alumno de su propio gimnasio (misma lógica que ya aplica sobre la
  // tabla `alumnos` — no hereda visibilidad de dueño/entrenador).
  const { data: reservaVistaPorOtroAlumno } = await alumnoA.client
    .from("reservas")
    .select("id")
    .eq("id", reservaA.id);
  record(
    "turnos: alumno → SELECT reserva de otro alumno del mismo gimnasio",
    (reservaVistaPorOtroAlumno?.length ?? 0) === 0,
    `filas visibles: ${reservaVistaPorOtroAlumno?.length ?? 0}`,
  );

  // El alumno reserva su PROPIO turno (11:30, INSERT vía RLS "alumno crea las propias").
  const { data: reservaPropia, error: reservaPropiaError } = await alumnoA.client
    .from("reservas")
    .insert({
      gimnasio_id: tenantA.gimnasioId,
      alumno_id: alumnoA.alumnoId,
      fecha: fechaIso,
      hora_inicio: "11:30",
      duracion_min: 90,
      creado_por: "alumno",
    })
    .select()
    .single();
  record(
    "turnos: alumno crea su propia reserva (INSERT permitido)",
    !reservaPropiaError && !!reservaPropia,
    reservaPropiaError?.message,
  );

  if (reservaPropia) {
    const { data: propiaLeida } = await alumnoA.client
      .from("reservas")
      .select("id")
      .eq("id", reservaPropia.id);
    record("turnos: alumno ve su propia reserva", (propiaLeida?.length ?? 0) === 1, `filas visibles: ${propiaLeida?.length ?? 0}`);

    // Intento de "cancelar" cambiando también otra columna (ej. la fecha, para
    // moverse a otro turno sin pasar por `reprogramar_reserva`): el trigger debe
    // rechazarlo, un alumno solo puede tocar `estado`. Usa una fecha distinta a la
    // original (`fechaIso` + 1 día) — si mandara el mismo valor no habría cambio real
    // y el trigger no tendría nada que rechazar.
    const otraFecha = new Date(fecha);
    otraFecha.setDate(otraFecha.getDate() + 1);
    const { error: cancelConCambioError } = await alumnoA.client
      .from("reservas")
      .update({ estado: "cancelada", fecha: otraFecha.toISOString().slice(0, 10) })
      .eq("id", reservaPropia.id);
    record(
      "turnos: alumno no puede cancelar y modificar otra columna a la vez",
      !!cancelConCambioError,
      cancelConCambioError?.message,
    );

    // Cancelación legítima, bien dentro de la ventana de 24 h (turno a 3 días).
    const { data: canceladaOk, error: cancelarOkError } = await alumnoA.client
      .from("reservas")
      .update({ estado: "cancelada" })
      .eq("id", reservaPropia.id)
      .select()
      .single();
    record(
      "turnos: alumno cancela su propia reserva dentro de la ventana de 24h",
      !cancelarOkError &&
        canceladaOk?.estado === "cancelada" &&
        canceladaOk?.cancelado_dentro_ventana === true &&
        canceladaOk?.cancelado_por === "alumno",
      cancelarOkError?.message ??
        `estado=${canceladaOk?.estado} dentro_ventana=${canceladaOk?.cancelado_dentro_ventana} cancelado_por=${canceladaOk?.cancelado_por}`,
    );

    // Una vez cancelada, no se puede volver a "cancelar" (ya no está 'reservada').
    const { error: doblecancelError } = await alumnoA.client
      .from("reservas")
      .update({ estado: "cancelada" })
      .eq("id", reservaPropia.id);
    record("turnos: no se puede cancelar dos veces la misma reserva", !!doblecancelError, doblecancelError?.message);
  }

  // Ni el alumno de A puede tocar la reserva de OTRO alumno del mismo gimnasio.
  const { data: cancelAjenaPorAlumno } = await alumnoA.client
    .from("reservas")
    .update({ estado: "cancelada" })
    .eq("id", reservaA.id)
    .select();
  record(
    "turnos: alumno no puede cancelar la reserva de otro alumno",
    (cancelAjenaPorAlumno?.length ?? 0) === 0,
    `filas afectadas: ${cancelAjenaPorAlumno?.length ?? 0}`,
  );

  // RPC `turnos_disponibilidad`: B no puede consultar disponibilidad del gimnasio de A.
  const { data: dispParaB } = await tenantB.client.rpc("turnos_disponibilidad", {
    p_gimnasio_id: tenantA.gimnasioId,
    p_desde: fechaIso,
    p_hasta: fechaIso,
  });
  record("turnos: RPC turnos_disponibilidad — B consulta el gimnasio de A", (dispParaB?.length ?? 0) === 0, `filas: ${dispParaB?.length ?? 0}`);

  const { data: dispParaA } = await tenantA.client.rpc("turnos_disponibilidad", {
    p_gimnasio_id: tenantA.gimnasioId,
    p_desde: fechaIso,
    p_hasta: fechaIso,
  });
  record(
    "turnos: RPC turnos_disponibilidad — A ve su propio gimnasio",
    (dispParaA?.length ?? 0) > 0,
    `filas: ${dispParaA?.length ?? 0}`,
  );

  // RPC `reprogramar_reserva`: B no puede reprogramar una reserva de A (no la
  // encuentra, RLS la filtra dentro de la función por ser SECURITY INVOKER).
  const { error: reprogramarPorBError } = await tenantB.client.rpc("reprogramar_reserva", {
    p_reserva_id: reservaA.id,
    p_nueva_fecha: fechaIso,
    p_nueva_hora: "11:30",
  });
  record("turnos: RPC reprogramar_reserva — B intenta reprogramar la reserva de A", !!reprogramarPorBError, reprogramarPorBError?.message);
}

/** Borra por id todo lo que se alcanzó a crear, sin importar si `createTenant` terminó
 * bien o a medio camino — usa las listas que van creciendo en vivo, no los objetos
 * `tenant` finales (que pueden no existir si la creación falló). */
async function cleanup(createdGimnasioIds, createdUserIds) {
  for (const gimnasioId of createdGimnasioIds) {
    await admin.from("gimnasios").delete().eq("id", gimnasioId);
  }
  for (const userId of createdUserIds) {
    await admin.auth.admin.deleteUser(userId);
  }
}

async function main() {
  const createdGimnasioIds = [];
  const createdUserIds = [];
  let tenantA;
  let tenantB;
  try {
    console.log("Creando tenants de prueba…");
    [tenantA, tenantB] = await Promise.all([
      createTenant("A", (id) => createdUserIds.push(id), (id) => createdGimnasioIds.push(id)),
      createTenant("B", (id) => createdUserIds.push(id), (id) => createdGimnasioIds.push(id)),
    ]);

    console.log("\nVerificando aislamiento…");
    await assertIsolation(tenantA, tenantB);
    await assertIsolation(tenantB, tenantA);

    console.log("\nCreando alumno de prueba (Sprint 6)…");
    const alumno = await createAlumnoUser(tenantA, (id) => createdUserIds.push(id));

    console.log("Verificando aislamiento del rol Alumno…");
    await assertAlumnoIsolation(alumno, tenantA, tenantB);

    console.log("\nVerificando aislamiento del CMS (Sprint 7)…");
    await assertCmsIsolation(tenantA, tenantB);

    console.log("\nVerificando aislamiento de turnos y reservas (Sprint 8)…");
    await assertTurnosIsolation(tenantA, tenantB, alumno);
  } finally {
    console.log("\nLimpiando datos de prueba…");
    await cleanup(createdGimnasioIds, createdUserIds);
  }

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} verificaciones OK.`);
  if (failed.length > 0) {
    console.error(`\n${failed.length} verificación(es) de aislamiento fallaron:`);
    for (const f of failed) console.error(`  - ${f.label}${f.detail ? ` (${f.detail})` : ""}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Error inesperado en la suite de aislamiento:", err);
  process.exit(1);
});
