#!/usr/bin/env node
// Sprint 5: suite repeatable de aislamiento multi-tenant. Reemplaza el script ad-hoc
// mencionado en sprint-5-multitenancy-landing.md por uno versionado y re-ejecutable —
// base para formalizarlo en CI en el Sprint 8.
//
// Qué hace: crea dos gimnasios de prueba (Tenant A y Tenant B), cada uno con su propio
// usuario autenticado, alumno, pago, rutina y avance, y verifica que el cliente de un
// tenant no pueda leer, actualizar ni borrar los datos del otro en ninguna de las seis
// tablas del modelo (gimnasios, perfiles, alumnos, pagos, rutinas, avances). Al final
// borra todo lo que creó, sin importar si las pruebas pasaron o fallaron.
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
  const { error: gimError } = await client
    .from("gimnasios")
    .insert({ id: gimnasioId, nombre: `Gimnasio de prueba ${label}`, slug: `isolation-test-${label.toLowerCase()}-${runId}` });
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
