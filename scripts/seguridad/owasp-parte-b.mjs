// Pruebas dinámicas OWASP Top 10 (Parte B). Crea usuarios y gimnasios TEMPORALES con
// service role, ejecuta las pruebas y los borra al terminar (verifica que no queden restos).
//
// Uso:  node --env-file=.env scripts/seguridad/owasp-parte-b.mjs
// Requiere `npm run dev` (BASE_URL, por defecto http://localhost:3000) para las pruebas HTTP.
// Credenciales desde .env; nunca se imprimen. Salida: JSON con PASS/FAIL por prueba.
import { createClient } from "@supabase/supabase-js";
import { writeFileSync } from "node:fs";
import { randomUUID, randomInt } from "node:crypto";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const SVC = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const OUT = process.env.OUT ?? "resultados-owasp.json";
const opts = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(URL, SVC, opts);
const anonClient = () => createClient(URL, ANON, opts);

const results = [];
const rec = (id, nombre, pass, evidencia = "") => {
  results.push({ id, nombre, resultado: pass === null ? "N/A" : pass ? "PASS" : "FAIL", evidencia });
  console.log(`${pass === null ? "N/A " : pass ? "PASS" : "FAIL"} ${id} ${nombre} ${evidencia ? "— " + evidencia : ""}`);
};

const NIVEL = process.env.NIVEL ?? "basico";
const tag = randomUUID().slice(0, 8);
const pw = () => "Tmp!" + randomUUID();
const created = { users: [], gyms: [], paths: [] };

async function mkUser(label) {
  const email = `sec-${tag}-${label}@example.test`;
  const password = pw();
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) throw new Error("createUser " + label + ": " + error.message);
  created.users.push(data.user.id);
  const c = anonClient();
  const { data: s, error: e2 } = await c.auth.signInWithPassword({ email, password });
  if (e2) throw new Error("login " + label + ": " + e2.message);
  return { id: data.user.id, email, password, client: c, session: s.session };
}
async function mkGym(label) {
  const { data, error } = await admin.from("gimnasios").insert({ nombre: `SEC ${tag} ${label}`, slug: `sec-${tag}-${label.toLowerCase()}` }).select().single();
  if (error) throw new Error("gym " + label + ": " + error.message);
  created.gyms.push(data.id);
  return data;
}
async function mkAlumno(gym, label, userId = null) {
  const { data, error } = await admin.from("alumnos").insert({
    gimnasio_id: gym, rut: 80000000 + randomInt(9000000), dig_ver: "1", nombres: `Al${label}`, apellidos: `Sec${tag}`,
    email: `al-${tag}-${label}@example.test`, user_id: userId,
  }).select().single();
  if (error) throw new Error("alumno " + label + ": " + error.message);
  return data;
}
const vacio = (r) => !r.error && (r.data == null || (Array.isArray(r.data) && r.data.length === 0));
const bloqueado = (r) => !!r.error || vacio(r);
const msg = (r) => (r.error ? `${r.error.code ?? ""} ${r.error.message}`.slice(0, 90) : `data=${JSON.stringify(r.data)?.slice(0, 60)}`);

async function main() {
  // ---------------- Fixture ----------------
  const gA = await mkGym("A");
  const gB = await mkGym("B");
  const uA = await mkUser("A"); // dueño A
  const uB = await mkUser("B"); // dueño B
  const uC = await mkUser("C"); // alumno de A
  const uC2 = await mkUser("C2"); // otro alumno de A
  const uD = await mkUser("D"); // sin perfil
  const uE = await mkUser("E"); // entrenador de A (spec 67)
  for (const [u, g, n] of [[uA, gA, "A"], [uB, gB, "B"]]) {
    const { error } = await admin.from("perfiles").insert({ id: u.id, gimnasio_id: g.id, nombre_completo: "Dueño " + n, rol: "dueño" });
    if (error) throw new Error("perfil " + n + ": " + error.message);
  }
  {
    const { error } = await admin.from("perfiles").insert({ id: uE.id, gimnasio_id: gA.id, nombre_completo: "Entrenador A", rol: "entrenador" });
    if (error) throw new Error("perfil entrenador: " + error.message);
  }
  const alC = await mkAlumno(gA.id, "C", uC.id);
  const alC2 = await mkAlumno(gA.id, "C2", uC2.id);
  const alB = await mkAlumno(gB.id, "B");
  const alA = await mkAlumno(gA.id, "A");
  const hoy = new Date().toISOString().slice(0, 10);
  const mkPago = async (g, al) => (await admin.from("pagos").insert({ gimnasio_id: g, alumno_id: al, monto: 1000, periodo_desde: hoy, periodo_hasta: hoy }).select().single()).data;
  const pagoB = await mkPago(gB.id, alB.id);
  const pagoC2 = await mkPago(gA.id, alC2.id);
  const pagoC = await mkPago(gA.id, alC.id);
  const rutB = (await admin.from("rutinas").insert({ gimnasio_id: gB.id, alumno_id: alB.id, nombre: "rutB" }).select().single()).data;
  const { data: planB } = await admin.from("planes").insert({ gimnasio_id: gB.id, nombre: "PlanB", nivel: NIVEL, precio: 1000, dias_por_semana: 3 }).select().single();
  const solB = await admin.from("solicitudes_pago").insert({
    gimnasio_id: gB.id, flujo: "alumno", alumno_id: alB.id, plan_id: planB?.id, meses: 1, monto: 1000, metodo: "transferencia", comprobante_path: "x", fecha_transferencia: hoy,
  }).select().single();
  const solC = await admin.from("solicitudes_pago").insert({
    gimnasio_id: gA.id, flujo: "alumno", alumno_id: alC.id, plan_id: (await admin.from("planes").insert({ gimnasio_id: gA.id, nombre: "PlanA", nivel: NIVEL, precio: 1000, dias_por_semana: 3 }).select().single()).data?.id,
    meses: 1, monto: 1000, metodo: "transferencia", comprobante_path: "x", fecha_transferencia: hoy,
  }).select().single();
  console.log("fixture ok", { solB: !!solB.data, solC: !!solC.data, e1: solB.error?.message, e2: solC.error?.message });
  if (!solC.data) throw new Error("fixture solicitudes: " + (solC.error?.message ?? solB.error?.message));

  // ---------------- A01 ----------------
  // 1/2. IDOR + RLS por tabla
  const tablas = ["alumnos", "pagos", "rutinas", "avances", "planes", "paquetes", "reservas", "horarios_disponibles", "registros_rutina",
    "sitios", "sitio_versiones", "cargas_alumnos", "solicitudes_pago", "solicitudes_cambio_plan", "solicitudes_cambio_plan_sistema",
    "cuentas_transferencia", "planes_nutricionales", "asignaciones_nutricionales", "recetas", "plan_nutricional_recetas", "rutina_plantillas", "gimnasios", "perfiles"];
  for (const [quien, u, gid] of [["dueño A", uA, gA.id], ["alumno C", uC, gA.id]]) {
    const fugas = [];
    for (const t of tablas) {
      const r = await u.client.from(t).select("*").limit(1000);
      if (r.error) continue;
      const col = t === "gimnasios" ? "id" : "gimnasio_id";
      const ajenas = (r.data ?? []).filter((x) => x[col] !== undefined && x[col] !== null && x[col] !== gid);
      if (ajenas.length) fugas.push(`${t}:${ajenas.length}`);
    }
    // Filas del catálogo sin gimnasio_id propio pueden ser globales (ejercicios, alimentos); se revisan aparte.
    rec(`A01.2-${quien}`, `Lectura cruzada de tenant como ${quien} (${tablas.length} tablas)`, fugas.length === 0, fugas.join(", ") || "sin filas de otro gimnasio");
  }
  {
    const r = await uA.client.from("alumnos").select("id").eq("id", alB.id);
    rec("A01.1a", "Dueño A lee alumno de B por id", vacio(r), msg(r));
    const r2 = await uA.client.from("alumnos").update({ nombres: "HACK" }).eq("id", alB.id).select();
    const chk = (await admin.from("alumnos").select("nombres").eq("id", alB.id).single()).data;
    rec("A01.1b", "Dueño A edita alumno de B", bloqueado(r2) && chk.nombres !== "HACK", msg(r2));
    const r3 = await uA.client.from("alumnos").delete().eq("id", alB.id).select();
    const chk3 = (await admin.from("alumnos").select("id").eq("id", alB.id)).data;
    rec("A01.1c", "Dueño A elimina alumno de B", bloqueado(r3) && chk3.length === 1, msg(r3));
    const r4 = await uA.client.from("pagos").delete().eq("id", pagoB.id).select();
    rec("A01.1d", "Dueño A elimina pago de B", bloqueado(r4) && (await admin.from("pagos").select("id").eq("id", pagoB.id)).data.length === 1, msg(r4));
    const r5 = await uA.client.from("pagos").insert({ gimnasio_id: gB.id, alumno_id: alB.id, monto: 1, periodo_desde: hoy, periodo_hasta: hoy });
    rec("A01.1e", "Dueño A inserta pago en gimnasio B", !!r5.error, msg(r5));
    const r5b = await uA.client.from("pagos").insert({ gimnasio_id: gA.id, alumno_id: alB.id, monto: 1, periodo_desde: hoy, periodo_hasta: hoy });
    rec("A01.1f", "Dueño A inserta pago en SU gimnasio para un alumno de B (alumno_id cruzado)", !!r5b.error, msg(r5b));
    if (!r5b.error) {
      await uA.client.from("pagos").update({ periodo_hasta: "2099-12-31" }).eq("alumno_id", alB.id).eq("gimnasio_id", gA.id);
      const vb = await uB.client.from("v_estado_cobranza_alumnos").select("*").eq("alumno_id", alB.id);
      rec("A01.1f2", "Efecto: el pago cruzado altera el estado de cobranza del alumno de B (vista v_estado_cobranza_alumnos)", !JSON.stringify(vb.data).includes("2099"), JSON.stringify(vb.data?.map((x) => ({ estado: x.estado_pago, vencimiento: x.vencimiento_actual }))) ?? vb.error?.message);
      await admin.from("pagos").delete().eq("alumno_id", alB.id).eq("gimnasio_id", gA.id);
    }
    const r6 = await uA.client.from("rutinas").update({ nombre: "HACK" }).eq("id", rutB.id).select();
    rec("A01.1g", "Dueño A edita rutina de B", bloqueado(r6), msg(r6));
    const r7 = await uA.client.from("rutinas").insert({ gimnasio_id: gA.id, alumno_id: alB.id, nombre: "x" });
    rec("A01.1h", "Dueño A crea rutina en A para alumno de B (alumno_id cruzado)", !!r7.error, msg(r7));
    if (!r7.error) await admin.from("rutinas").delete().eq("alumno_id", alB.id).eq("gimnasio_id", gA.id);
    const r8 = await uA.client.from("alumnos").insert({ gimnasio_id: gB.id, rut: 70000000 + randomInt(9000000), dig_ver: "1", nombres: "x", apellidos: "y" });
    rec("A01.1i", "Dueño A crea alumno en gimnasio B", !!r8.error, msg(r8));
    const r9 = await uA.client.from("gimnasios").update({ plan: "crecimiento", estado: "activo" }).eq("id", gA.id).select();
    const plan = (await admin.from("gimnasios").select("plan").eq("id", gA.id).single()).data.plan;
    rec("A01.1j", "Dueño A cambia el plan de su propio gimnasio (autoasignarse plan)", plan === "prueba", `plan resultante=${plan} ${msg(r9)}`);
    if (plan !== "prueba") await admin.from("gimnasios").update({ plan: "prueba" }).eq("id", gA.id);
  }
  // Alumno C
  {
    const r = await uC.client.from("alumnos").select("id").eq("id", alC2.id);
    rec("A01.1k", "Alumno C lee ficha de otro alumno del mismo gimnasio", vacio(r), msg(r));
    const r2 = await uC.client.from("pagos").select("id").eq("id", pagoC2.id);
    rec("A01.1l", "Alumno C lee pago de otro alumno del mismo gimnasio", vacio(r2), msg(r2));
    const r3 = await uC.client.from("pagos").select("id").eq("id", pagoC.id);
    rec("A01.1m", "Alumno C ve sus propios pagos (control positivo)", !r3.error && r3.data.length === 1, msg(r3));
    for (const [campo, valor] of [["plan_id", randomUUID()], ["activo", false], ["puede_registrar_avances", true], ["rut", 11111111], ["gimnasio_id", gB.id], ["user_id", uC2.id]]) {
      const r4 = await uC.client.from("alumnos").update({ [campo]: valor }).eq("id", alC.id).select();
      const v = (await admin.from("alumnos").select("*").eq("id", alC.id).single()).data;
      rec(`A01.1n-${campo}`, `Alumno C se modifica a sí mismo \`${campo}\``, v[campo] === alC[campo], msg(r4));
    }
    const r5 = await uC.client.from("alumnos").update({ telefono: "123456" }).eq("id", alC.id).select();
    rec("A01.1o", "Alumno C edita su teléfono (control positivo)", !r5.error && r5.data?.length === 1, msg(r5));
    const r6 = await uC.client.from("alumnos").update({ nombres: "HACK" }).eq("id", alC2.id).select();
    rec("A01.1p", "Alumno C edita a otro alumno", bloqueado(r6), msg(r6));
    const r7 = await uC.client.from("pagos").insert({ gimnasio_id: gA.id, alumno_id: alC.id, monto: 1, periodo_desde: hoy, periodo_hasta: hoy });
    rec("A01.1q", "Alumno C se inserta un pago", !!r7.error, msg(r7));
    const r8 = await uC.client.from("sitios").update({ tema: "claro" }).eq("gimnasio_id", gA.id).select();
    rec("A01.1r", "Alumno C edita el sitio público del gimnasio", bloqueado(r8), msg(r8));
  }
  // 3. security definer / RPC
  {
    const rpcs = [
      ["aplicar_solicitud_pago", { p_id: solC.data?.id ?? randomUUID() }],
      ["importar_alumnos", { p_filas: [], p_actualizar: false, p_archivo: "x.xlsx", p_errores: [] }],
      ["aplicar_cambios_plan_vencidos", {}],
      ["plan_sistema_requerido", { p_gimnasio_id: gB.id }],
      ["turnos_disponibilidad", { p_gimnasio_id: gB.id, p_desde: hoy, p_hasta: hoy }],
      ["reprogramar_reserva", { p_reserva_id: randomUUID(), p_nueva_fecha: hoy, p_nueva_hora: "10:00" }],
      ["asignar_rutina_alumno", { p_alumno_id: alB.id, p_gimnasio_id: gB.id, p_plantilla_id: randomUUID(), p_creado_por: uA.id, p_fecha_asignacion: hoy }],
      ["gimnasio_sin_perfiles", { p_gimnasio: gB.id }],
      ["usuario_es_alumno", {}],
      ["buscar_gimnasios", { termino: "" }],
      ["listar_sitios_publicados", {}],
      ["listar_planes_publico", { p_gimnasio_id: gB.id }],
      ["obtener_sitio_publico", { p_slug: `sec-${tag}-b` }],
    ];
    for (const [nombre, args] of rpcs) {
      const out = {};
      for (const [q, c] of [["anon", anonClient()], ["alumnoC", uC.client], ["dueñoA", uA.client]]) {
        const r = await c.rpc(nombre, args);
        out[q] = r.error ? `ERR ${r.error.code}` : `ok(${Array.isArray(r.data) ? r.data.length : typeof r.data})`;
      }
      results.push({ id: `A01.3-${nombre}`, nombre: `RPC ${nombre}`, resultado: "INFO", evidencia: JSON.stringify(out) });
      console.log("INFO A01.3", nombre, JSON.stringify(out));
    }
    // Veredictos explícitos
    const r1 = await uA.client.rpc("aplicar_solicitud_pago", { p_id: solC.data.id });
    const est = (await admin.from("solicitudes_pago").select("estado").eq("id", solC.data.id).single()).data.estado;
    rec("A01.3a", "Dueño A invoca aplicar_solicitud_pago por RPC", !!r1.error && est === "pendiente", msg(r1));
    const r1b = await uC.client.rpc("aplicar_solicitud_pago", { p_id: solC.data.id });
    rec("A01.3b", "Alumno C invoca aplicar_solicitud_pago por RPC", !!r1b.error && (await admin.from("solicitudes_pago").select("estado").eq("id", solC.data.id).single()).data.estado === "pendiente", msg(r1b));
    const r2 = await uC.client.rpc("importar_alumnos", { p_filas: [{ rut: 12345678, dig_ver: "5", nombres: "x", apellidos: "y" }], p_actualizar: false, p_archivo: "x.xlsx", p_errores: [] });
    const nuevos = (await admin.from("alumnos").select("id").eq("apellidos", "y").eq("nombres", "x")).data;
    rec("A01.3c", "Alumno C invoca importar_alumnos (solo dueño)", !!r2.error, msg(r2));
    // Spec 64: las funciones auxiliares ya no son ejecutables sin sesión.
    for (const [nombre, args] of [["gimnasio_sin_perfiles", { p_gimnasio: gB.id }], ["usuario_es_alumno", {}], ["plan_sistema_requerido", { p_gimnasio_id: gB.id }]]) {
      const r = await anonClient().rpc(nombre, args);
      rec(`A01.3-anon-${nombre}`, `Anon invoca ${nombre} (debe dar 42501)`, r.error?.code === "42501", msg(r));
    }
    const r3 = await uA.client.rpc("asignar_rutina_alumno", { p_alumno_id: alB.id, p_gimnasio_id: gB.id, p_plantilla_id: randomUUID(), p_creado_por: uA.id, p_fecha_asignacion: hoy });
    rec("A01.3d", "Dueño A asigna rutina a alumno de B vía RPC (security invoker)", !!r3.error, msg(r3));
  }
  // 5/6. Escalada de rol (regresión 0036)
  {
    const r1 = await uA.client.from("perfiles").update({ gimnasio_id: gB.id }).eq("id", uA.id).select();
    rec("A01.6a", "Dueño A cambia gimnasio_id de su perfil (regresión 0036)", bloqueado(r1) && (await admin.from("perfiles").select("gimnasio_id").eq("id", uA.id).single()).data.gimnasio_id === gA.id, msg(r1));
    const r2 = await uD.client.from("perfiles").insert({ id: uD.id, gimnasio_id: gB.id, nombre_completo: "evil", rol: "dueño" });
    rec("A01.6b", "Usuario sin perfil se auto-asigna como dueño de gimnasio ajeno", !!r2.error, msg(r2));
    const r3 = await uC.client.from("perfiles").insert({ id: uC.id, gimnasio_id: gA.id, nombre_completo: "evil", rol: "dueño" });
    rec("A01.6c", "Alumno C se inserta un perfil de dueño en su gimnasio", !!r3.error, msg(r3));
    const r4 = await uC.client.from("gimnasios").insert({ nombre: "alumno-gym", slug: `sec-${tag}-alu` });
    if (!r4.error) await admin.from("gimnasios").delete().eq("slug", `sec-${tag}-alu`);
    rec("A01.6d", "Alumno C crea un gimnasio", !!r4.error, msg(r4));
    const r5 = await uA.client.from("superadmins").select("*");
    const r6 = await uA.client.from("superadmins").insert({ id: uA.id });
    rec("A01.6e", "Dueño A lee/inserta en superadmins", (r5.data ?? []).length === 0 && !!r6.error, `select=${msg(r5)} insert=${msg(r6)}`);
  }
  // Spec 69: eventos_seguridad sólo legible por superadmin; nadie más lee ni escribe.
  {
    await admin.from("eventos_seguridad").insert({ tipo: "prueba_owasp", detalle: { tag } });
    for (const [quien, c] of [["dueño A", uA.client], ["alumno C", uC.client], ["anon", anonClient()]]) {
      const rl = await c.from("eventos_seguridad").select("id").limit(5);
      rec(`A09.1-lee-${quien}`, `${quien} lee eventos_seguridad`, bloqueado(rl), msg(rl));
      const ri = await c.from("eventos_seguridad").insert({ tipo: "falso", detalle: {} });
      rec(`A09.1-inserta-${quien}`, `${quien} inserta en eventos_seguridad`, !!ri.error, msg(ri));
    }
    await admin.from("eventos_seguridad").delete().eq("tipo", "prueba_owasp");
  }
  // Anon
  {
    const fugas = [];
    for (const t of [...tablas, "superadmins", "planes_sistema", "ejercicios", "alimentos"]) {
      const r = await anonClient().from(t).select("*").limit(5);
      if (!r.error && r.data?.length) fugas.push(`${t}:${r.data.length}`);
    }
    rec("A01.2-anon", "Lectura anónima de tablas (sin sesión)", fugas.length === 0, fugas.join(", ") || "todas vacías o denegadas");
  }

  // ---------------- A06 ----------------
  {
    const r1 = await uC.client.from("solicitudes_pago").insert({ gimnasio_id: gA.id, flujo: "alumno", alumno_id: alC.id, meses: 1, monto: 1, metodo: "transferencia" });
    rec("A06.1a", "Alumno C inserta solicitud_pago directa con monto=1", !!r1.error, msg(r1));
    const r2 = await uC.client.from("solicitudes_pago").update({ estado: "confirmado", monto: 1 }).eq("id", solC.data.id).select();
    rec("A06.1b", "Alumno C confirma/altera su propia solicitud_pago", bloqueado(r2) && (await admin.from("solicitudes_pago").select("estado,monto").eq("id", solC.data.id).single()).data.estado === "pendiente", msg(r2));
    const r3 = await uA.client.from("solicitudes_pago").update({ estado: "confirmado" }).eq("gimnasio_id", gA.id).select();
    rec("A06.1c", "Dueño A confirma solicitud_pago por UPDATE directo (sin pasar por la action)", bloqueado(r3), msg(r3));
    const r4 = await uC.client.from("solicitudes_cambio_plan").insert({ gimnasio_id: gA.id, alumno_id: alC2.id, plan_id: randomUUID() });
    rec("A06.1d", "Alumno C crea solicitud_cambio_plan para OTRO alumno", !!r4.error, msg(r4));
    const r5 = await uA.client.from("cuentas_transferencia").insert({ gimnasio_id: gB.id });
    rec("A06.1e", "Dueño A inserta cuenta_transferencia en B", !!r5.error, msg(r5));
    const r6 = await uA.client.from("planes_sistema").update({ precio: 1 }).neq("id", randomUUID()).select();
    rec("A06.1f", "Dueño A modifica planes_sistema (precios del sistema)", bloqueado(r6), msg(r6));
    const r7 = await uA.client.from("solicitudes_cambio_plan_sistema").select("*").neq("gimnasio_id", gA.id);
    rec("A06.1g", "Dueño A lee solicitudes de cambio de plan de otros gimnasios", vacio(r7), msg(r7));
  }

  // ---------------- A05 ----------------
  {
    // Filtros PostgREST con caracteres especiales (mismo saneado que las páginas)
    const payloads = ["%", "_", "a,id.neq.0", "x),or(gimnasio_id.neq.0", "'; drop table alumnos;--", "a.or(", "\\"];
    let ok = true; const det = [];
    for (const p of payloads) {
      const qSafe = p.replace(/[,%]/g, "");
      const r = await uA.client.from("alumnos").select("id,gimnasio_id").or(`nombres.ilike.%${qSafe}%,apellidos.ilike.%${qSafe}%`);
      const fuga = (r.data ?? []).some((x) => x.gimnasio_id !== gA.id);
      if (fuga) ok = false;
      det.push(`${JSON.stringify(p)}→${r.error ? "err" : r.data.length}`);
    }
    rec("A05.1", "Filtros .or/ilike con %, _, comas, paréntesis: nunca salen filas de otro tenant", ok, det.join(" | "));
    // Variante sin ( ) saneados (alumnos/pagos/export solo quitan , y %): ¿se puede inyectar un filtro?
    const inj = "x)"; // sin coma no se puede añadir otra condición al or(), solo romper la sintaxis
    const r = await uA.client.from("alumnos").select("id").or(`nombres.ilike.%${inj}%,apellidos.ilike.%${inj}%`);
    results.push({ id: "A05.1b", nombre: "Paréntesis sin sanear en alumnos/pagos (solo se quitan , y %)", resultado: "INFO", evidencia: r.error ? `error de sintaxis controlado (${r.error.code}); sin ampliación de alcance` : `sin error, ${r.data.length} filas` });
    // XSS almacenado: se guarda tal cual y debe renderizarse escapado (React) — se verifica en el HTML en la parte HTTP
    const xss = `<img src=x onerror=alert(1)>${tag}`;
    const r2 = await admin.from("alumnos").update({ nombres: xss }).eq("id", alA.id);
    rec("A05.2-seed", "XSS: payload almacenado en nombres de alumno (se valida el render en HTTP)", !r2.error, xss);
    ctx.xss = xss; ctx.alA = alA;
  }

  // ---------------- A10 / A02: Storage ----------------
  {
    const svg = new Blob(['<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'], { type: "image/svg+xml" });
    const png = new Blob([Buffer.from("89504e470d0a1a0a", "hex")], { type: "image/png" });
    const grande = new Blob([Buffer.alloc(5 * 1024 * 1024 + 10)], { type: "image/png" });
    const sub = async (c, bucket, path, blob, ct) => c.storage.from(bucket).upload(path, blob, { contentType: ct ?? blob.type });
    const mark = (p) => created.paths.push(p);
    let r = await sub(uA.client, "sitio-imagenes", `${gA.id}/${tag}.svg`, svg); mark(["sitio-imagenes", `${gA.id}/${tag}.svg`]);
    rec("A02.4a", "Subir SVG (con <script>) a sitio-imagenes", !!r.error, msg(r));
    r = await sub(uA.client, "sitio-imagenes", `${gA.id}/${tag}-fake.png`, svg, "image/png"); mark(["sitio-imagenes", `${gA.id}/${tag}-fake.png`]);
    results.push({ id: "A02.4b", nombre: "SVG renombrado .png con Content-Type image/png (MIME declarado falso)", resultado: "INFO", evidencia: r.error ? "rechazado: " + r.error.message : "ACEPTADO (Storage valida el MIME declarado, no el contenido; se sirve con el Content-Type image/png y nosniff, no ejecuta script)" });
    r = await sub(uA.client, "sitio-imagenes", `${gA.id}/${tag}-big.png`, grande); mark(["sitio-imagenes", `${gA.id}/${tag}-big.png`]);
    rec("A02.4c", "Subir imagen > 5 MB a sitio-imagenes", !!r.error, msg(r));
    r = await sub(uA.client, "sitio-imagenes", `${gB.id}/${tag}.png`, png); mark(["sitio-imagenes", `${gB.id}/${tag}.png`]);
    rec("A02.4d", "Dueño A sube a la carpeta de B en sitio-imagenes", !!r.error, msg(r));
    r = await sub(uA.client, "sitio-imagenes", `${gA.id}/../${gB.id}/${tag}-trav.png`, png); mark(["sitio-imagenes", `${gA.id}/../${gB.id}/${tag}-trav.png`]);
    rec("A02.4e", "Path traversal ../ hacia carpeta de B", !!r.error, msg(r));
    r = await sub(uC.client, "sitio-imagenes", `${gA.id}/${tag}-alu.png`, png); mark(["sitio-imagenes", `${gA.id}/${tag}-alu.png`]);
    rec("A02.4f", "Alumno C sube a la carpeta de su gimnasio en sitio-imagenes", !!r.error, msg(r));
    // comprobantes (privado)
    r = await sub(uC.client, "comprobantes-pago", `${gA.id}/${uC.id}/${tag}.png`, png); mark(["comprobantes-pago", `${gA.id}/${uC.id}/${tag}.png`]);
    rec("A02.4g", "Alumno C sube comprobante a su propia carpeta (control positivo)", !r.error, msg(r));
    const l1 = await uC2.client.storage.from("comprobantes-pago").download(`${gA.id}/${uC.id}/${tag}.png`);
    rec("A02.4h", "Alumno C2 lee comprobante de C", !!l1.error, msg({ error: l1.error }));
    const l2 = await uB.client.storage.from("comprobantes-pago").download(`${gA.id}/${uC.id}/${tag}.png`);
    rec("A02.4i", "Dueño de OTRO gimnasio (B) lee comprobante del alumno C de A", !!l2.error, msg({ error: l2.error }));
    const l3 = await uA.client.storage.from("comprobantes-pago").download(`${gA.id}/${uC.id}/${tag}.png`);
    results.push({ id: "A02.4j", nombre: "Dueño A lee comprobante de su alumno (control positivo)", resultado: l3.error ? "INFO" : "PASS", evidencia: l3.error ? l3.error.message : "ok" });
    const l4 = await anonClient().storage.from("comprobantes-pago").list(`${gA.id}/${uC.id}`);
    rec("A02.4k", "Listado anónimo de comprobantes-pago", !l4.data?.length, JSON.stringify(l4.data)?.slice(0, 60) ?? l4.error?.message);
    const l5 = await uB.client.storage.from("comprobantes-pago").list(`${gA.id}/${uC.id}`);
    rec("A02.4l", "Dueño B enumera carpeta de comprobantes de C", !l5.data?.length, JSON.stringify(l5.data)?.slice(0, 60) ?? l5.error?.message);
    const l6 = await fetch(`${URL}/storage/v1/object/public/comprobantes-pago/${uC.id}/${tag}.png`);
    rec("A02.4m", "URL pública del bucket privado comprobantes-pago", l6.status >= 400, `HTTP ${l6.status}`);
  }

  // ---------------- A07 ----------------
  {
    const c = anonClient();
    const ok = await c.auth.signInWithPassword({ email: uA.email, password: "mala" });
    const no = await c.auth.signInWithPassword({ email: `noexiste-${tag}@example.test`, password: "mala" });
    rec("A07.1a", "Login: mismo mensaje para cuenta existente e inexistente", ok.error?.message === no.error?.message, `${ok.error?.message} | ${no.error?.message}`);
    const rr1 = await c.auth.resetPasswordForEmail(uA.email, { redirectTo: "https://evil.example/" });
    const rr2 = await c.auth.resetPasswordForEmail(`noexiste-${tag}@example.test`, { redirectTo: "https://evil.example/" });
    results.push({ id: "A07.1b", nombre: "Recuperación: respuesta para cuenta existente vs inexistente (dominio de prueba no entregable; INCONCLUSA, repetir a mano con un buzón propio)", resultado: "INFO", evidencia: `${rr1.error?.message ?? "ok"} | ${rr2.error?.message ?? "ok"}` });
    // sesión tras cerrar sesión
    const c2 = anonClient();
    const { data: s } = await c2.auth.signInWithPassword({ email: uD.email, password: uD.password });
    const tokenViejo = s.session.access_token;
    await c2.auth.signOut();
    const v = await fetch(`${URL}/auth/v1/user`, { headers: { apikey: ANON, Authorization: `Bearer ${tokenViejo}` } });
    results.push({ id: "A07.3a", nombre: "Access token tras signOut (el JWT sigue válido hasta expirar; signOut revoca el refresh token)", resultado: "INFO", evidencia: `/auth/v1/user con token previo → HTTP ${v.status}` });
    const rf = await anonClient().auth.refreshSession({ refresh_token: s.session.refresh_token });
    rec("A07.3b", "Refresh token revocado tras signOut", !!rf.error, rf.error?.message ?? "REFRESCÓ");
    // alumno dado de baja
    await admin.from("alumnos").update({ activo: false }).eq("id", alC.id);
    const rbaja = await uC.client.from("alumnos").select("id,activo").eq("id", alC.id);
    results.push({ id: "A07.3c", nombre: "Alumno dado de baja conserva lectura de su ficha vía API (el bloqueo es de UI/proxy de la app)", resultado: "INFO", evidencia: msg(rbaja) });
    await admin.from("alumnos").update({ activo: true }).eq("id", alC.id);
    // validación de contraseña débil
    const weak = await anonClient().auth.signUp({ email: `weak-${tag}@example.test`, password: "123" });
    rec("A07.1c", "Registro con contraseña de 3 caracteres", !!weak.error, weak.error?.message ?? "ACEPTADA");
    if (weak.data?.user?.id) created.users.push(weak.data.user.id);
  }

  // ---------------- HTTP (A01.5, A02, A05.2, A08, A10) ----------------
  await pruebasHttp({ uA, uB, uC, uD, uE, gA, gB, alA, alB, alC, alC2 });

  return;
}

const ctx = {};

// Cookie de sesión compatible con @supabase/ssr (base64url + chunks de 3180)
function cookieHeader(session) {
  const ref = new globalThis.URL(URL).hostname.split(".")[0];
  const key = `sb-${ref}-auth-token`;
  const val = "base64-" + Buffer.from(JSON.stringify(session)).toString("base64url");
  const parts = [];
  const N = 3180;
  if (val.length <= N) parts.push(`${key}=${val}`);
  else for (let i = 0; i * N < val.length; i++) parts.push(`${key}.${i}=${val.slice(i * N, (i + 1) * N)}`);
  return parts.join("; ");
}
const http = async (path, { cookie, method = "GET", headers = {}, body } = {}) =>
  fetch(BASE + path, { method, redirect: "manual", headers: { ...(cookie ? { cookie } : {}), ...headers }, body });

async function pruebasHttp({ uA, uB, uC, uD, uE, gA, gB, alA, alB, alC }) {
  let vivo = true;
  try { await fetch(BASE + "/robots.txt"); } catch { vivo = false; }
  if (!vivo) { rec("HTTP", "Servidor Next no disponible en " + BASE, null, "omitidas"); return; }
  const cA = cookieHeader(uA.session), cB = cookieHeader(uB.session), cC = cookieHeader(uC.session), cD = cookieHeader(uD.session), cE = cookieHeader(uE.session);
  const loc = (r) => r.headers.get("location") ?? "";

  // A01.5 rutas por rol
  for (const p of ["/protected", "/protected/alumnos", "/portal", "/superadmin", "/api/export/alumnos?format=xlsx", "/api/export/pagos?format=xlsx", "/api/export/bitacora?format=xlsx"]) {
    const r = await http(p);
    rec(`A01.5-anon${p}`, `Sin sesión: ${p}`, r.status >= 300 && r.status < 400 && loc(r).includes("/auth/login"), `HTTP ${r.status} → ${loc(r)}`);
  }
  for (const [quien, cookie, p, esperado] of [
    ["dueño A", cA, "/superadmin", "no debe ver el panel"],
    ["alumno C", cC, "/superadmin", "no debe ver el panel"],
    ["dueño A", cA, "/portal", "no debe ver el portal del alumno"],
    ["alumno C", cC, "/protected/alumnos", "no debe ver el panel del dueño"],
    ["alumno C", cC, "/protected/pagos", "no debe ver el panel del dueño"],
  ]) {
    const r = await http(p, { cookie });
    const txt = r.status === 200 ? await r.text() : "";
    const bloqueado = r.status >= 300 || /no encontrad|not found|404/i.test(txt) || !txt.includes(`Sec${tag}`);
    rec(`A01.5-${quien}${p}`, `${quien} → ${p} (${esperado})`, bloqueado, `HTTP ${r.status} → ${loc(r) || "(sin Location)"}`);
  }
  // Exports: roles
  for (const f of ["alumnos", "pagos", "bitacora"]) {
    const r = await http(`/api/export/${f}?format=xlsx`, { cookie: cC });
    rec(`A01.4-${f}`, `Alumno C descarga /api/export/${f}`, r.status === 401 || r.status === 403 || (r.status === 200 && (await r.arrayBuffer()).byteLength < 7000 && false), `HTTP ${r.status} ${r.headers.get("content-type") ?? ""} ${r.status === 200 ? (await r.clone().arrayBuffer()).byteLength + " bytes" : ""}`);
  }
  // Spec 67: alumno → 403 exacto; usuario sin perfil no dispara onboarding; entrenador sin pagos.
  for (const f of ["alumnos", "pagos", "bitacora"]) {
    const r = await http(`/api/export/${f}?format=xlsx`, { cookie: cC });
    rec(`A01.4-403-${f}`, `Alumno C → export ${f} responde 403`, r.status === 403 || r.status === 401, `HTTP ${r.status}`);
  }
  {
    const antes = (await admin.from("gimnasios").select("id", { count: "exact", head: true })).count;
    const r = await http(`/api/export/alumnos?format=xlsx`, { cookie: cD });
    const despues = (await admin.from("gimnasios").select("id", { count: "exact", head: true })).count;
    rec("A01.4-sin-perfil", "Usuario sin perfil en export: 401/403 y sin crear gimnasio", (r.status === 401 || r.status === 403) && antes === despues, `HTTP ${r.status} gimnasios ${antes}→${despues}`);
  }
  for (const [f, esperado] of [["alumnos", 200], ["pagos", 403], ["bitacora", 200]]) {
    const r = await http(`/api/export/${f}?format=xlsx`, { cookie: cE });
    rec(`A01.4-entrenador-${f}`, `Entrenador → export ${f} (esperado ${esperado})`, r.status === esperado, `HTTP ${r.status}`);
  }
  for (const p of ["/api/export/template-alumnos", "/api/export/reporte-carga-alumnos?id=" + randomUUID()]) {
    const r = await http(p, { cookie: cE });
    rec(`A01.4-entrenador-${p.split("?")[0]}`, `Entrenador → ${p.split("?")[0]} responde 403`, r.status === 403, `HTTP ${r.status}`);
  }
  {
    const r = await http(`/api/export/alumno-progreso?alumno=${alC.id}&anio=2026`, { cookie: cC });
    rec("A01.4-progreso", "Alumno C descarga /api/export/alumno-progreso de su propia ficha", r.status === 401 || r.status === 403, `HTTP ${r.status}`);
  }
  // IDOR export
  {
    const r = await http(`/api/export/alumno-progreso?alumno=${alB.id}&anio=2026`, { cookie: cA });
    rec("A01.1-export-progreso", "Dueño A → export alumno-progreso de alumno de B", r.status === 404, `HTTP ${r.status}`);
    const rr = await http(`/api/export/reporte-carga-alumnos?id=${randomUUID()}`, { cookie: cA });
    rec("A01.1-export-reporte", "Dueño A → reporte-carga con id ajeno/inexistente", rr.status === 404, `HTTP ${rr.status}`);
    const rc = await http(`/api/export/reporte-carga-alumnos?id=${randomUUID()}`, { cookie: cC });
    rec("A01.4-reporte-alumno", "Alumno C → reporte-carga-alumnos", rc.status === 403 || rc.status === 401, `HTTP ${rc.status}`);
    const rt = await http(`/api/export/template-alumnos`, { cookie: cC });
    rec("A01.4-template-alumno", "Alumno C → template-alumnos", rt.status === 403 || rt.status === 401, `HTTP ${rt.status}`);
    const rm = await http(`/api/alumnos/carga-masiva`, { cookie: cC, method: "POST", body: new FormData() });
    rec("A01.4-carga-alumno", "Alumno C → POST carga-masiva", rm.status === 403 || rm.status === 401, `HTTP ${rm.status}`);
  }
  // Export del dueño A solo contiene su gimnasio
  {
    const r = await http(`/api/export/alumnos?format=xlsx`, { cookie: cA });
    const buf = Buffer.from(await r.arrayBuffer());
    const ExcelJS = (await import("exceljs")).default;
    const wb = new ExcelJS.Workbook(); await wb.xlsx.load(buf);
    const filas = []; wb.worksheets[0].eachRow((row) => filas.push(row.values.join("|")));
    const conB = filas.filter((x) => x.includes("AlB")).length;
    rec("A01.1-export-alumnos", "Export de alumnos de A no incluye alumnos de B", r.status === 200 && conB === 0, `${filas.length - 1} filas, ${conB} de B`);
    // CSV/fórmula injection
    await admin.from("alumnos").update({ nombres: "=HYPERLINK(\"http://evil\",\"x\")", apellidos: `Sec${tag}` }).eq("id", alA.id);
    const r2 = await http(`/api/export/alumnos?format=xlsx`, { cookie: cA });
    const wb2 = new ExcelJS.Workbook(); await wb2.xlsx.load(Buffer.from(await r2.arrayBuffer()));
    let celda = null;
    wb2.worksheets[0].eachRow((row) => { const v = row.getCell(1).value; if (typeof v === "string" && v.includes("HYPERLINK")) celda = v; if (v && typeof v === "object" && v.formula) celda = "FORMULA:" + v.formula; });
    rec("A05.3", "Export xlsx: nombre que empieza por '=' se guarda como texto (cadena), no como fórmula", celda !== null && !String(celda).startsWith("FORMULA:"), `celda=${JSON.stringify(celda)}`);
    await admin.from("alumnos").update({ nombres: ctx.xss }).eq("id", alA.id);
  }
  // XSS render
  {
    const r = await http(`/protected/alumnos?q=${tag}`, { cookie: cA });
    const html = await r.text();
    const crudo = html.includes("<img src=x onerror=alert(1)>");
    const escapado = html.includes("&lt;img src=x onerror=alert(1)&gt;");
    rec("A05.2", "XSS almacenado en nombre de alumno se renderiza escapado en el panel", r.status === 200 && !crudo && escapado, `HTTP ${r.status} crudo=${crudo} escapado=${escapado}`);
  }
  // Headers (A02)
  {
    const r = await http("/auth/login");
    const h = Object.fromEntries(r.headers.entries());
    for (const k of ["x-frame-options", "x-content-type-options", "referrer-policy", "strict-transport-security", "permissions-policy"]) rec(`A02.hdr-${k}`, `Header ${k}`, !!h[k], h[k] ?? "ausente");
    rec("A02.1", "Content-Security-Policy presente", !!(h["content-security-policy"] || h["content-security-policy-report-only"]), h["content-security-policy"] ?? h["content-security-policy-report-only"] ?? "ausente");
    rec("A02.hdr-xpowered", "X-Powered-By no expuesto", !h["x-powered-by"], h["x-powered-by"] ?? "ausente");
    const sc = r.headers.getSetCookie?.() ?? [];
    results.push({ id: "A02.3a", nombre: "Set-Cookie en /auth/login sin sesión", resultado: "INFO", evidencia: sc.length ? sc.join(" || ").replace(/=[^;]{10,}/g, "=<…>") : "ninguna" });
  }
  // Cookies de sesión: flags reales al refrescar
  {
    const ref = new globalThis.URL(URL).hostname.split(".")[0];
    const sesion = { ...uA.session, expires_at: Math.floor(Date.now() / 1000) + 5 }; // fuerza refresco
    const r = await http("/protected", { cookie: cookieHeader(sesion) });
    const sc = (r.headers.getSetCookie?.() ?? []).filter((c) => c.includes("auth-token"));
    results.push({ id: "A02.3b", nombre: "Flags de la cookie de sesión emitida por @supabase/ssr", resultado: "INFO", evidencia: sc.length ? sc.map((c) => c.replace(/=[^;]{10,}/, "=<…>")).join(" || ") : "no se emitió cookie (sesión no refrescada)" });
  }
  // Revalidate
  {
    const r1 = await http("/api/revalidate-sitio?slug=x", { cookie: cA });
    rec("A08.3a", "revalidate-sitio sin secreto (con sesión de dueño)", r1.status === 401, `HTTP ${r1.status}`);
    const r2 = await http("/api/revalidate-sitio?slug=x", { cookie: cA, headers: { "x-revalidate-secret": "incorrecto" } });
    rec("A08.3b", "revalidate-sitio con secreto incorrecto", r2.status === 401, `HTTP ${r2.status}`);
    const r3b = await http("/api/revalidate-sitio?slug=x", { cookie: cA, headers: { "x-revalidate-secret": SVC } });
    rec("A02.1-revalidate-svc", "revalidate-sitio rechaza la clave service_role en el header (spec 65)", r3b.status === 401, `HTTP ${r3b.status}`);
    if (process.env.REVALIDATE_SECRET) {
      const r4 = await http("/api/revalidate-sitio?slug=x", { cookie: cA, headers: { "x-revalidate-secret": process.env.REVALIDATE_SECRET } });
      rec("A02.1-revalidate-ok", "revalidate-sitio acepta REVALIDATE_SECRET (control positivo)", r4.status === 200, `HTTP ${r4.status}`);
    }
    const r3 = await http(`/api/revalidate-sitio?slug=x&secret=${SVC}`, { cookie: cA });
    rec("A08.3c", "revalidate-sitio con el secreto en la URL (query) no se acepta", r3.status === 401, `HTTP ${r3.status}`);
  }
  // Webhook MP
  {
    const body = JSON.stringify({ type: "payment", data: { id: "123" } });
    const h = { "content-type": "application/json" };
    const r1 = await http("/api/mercadopago/webhook?data.id=123", { method: "POST", headers: h, body });
    rec("A08.1a", "Webhook MP sin firma (503 = sin credenciales en este entorno, falla cerrado)", r1.status === 401 || r1.status === 503, `HTTP ${r1.status}`);
    const r2 = await http("/api/mercadopago/webhook?data.id=123", { method: "POST", headers: { ...h, "x-signature": "ts=1,v1=deadbeef", "x-request-id": "r" }, body });
    rec("A08.1b", "Webhook MP con firma inválida", r2.status === 401 || r2.status === 503, `HTTP ${r2.status}`);
    const r3 = await http("/api/mercadopago/webhook?flujo=suscripcion&data.id=123", { method: "POST", headers: { ...h, "x-signature": "ts=1,v1=deadbeef", "x-request-id": "r" }, body });
    rec("A08.1c", "Webhook MP flujo=suscripcion con firma inválida", r3.status === 401 || r3.status === 503, `HTTP ${r3.status}`);
    const r4 = await http("/api/mercadopago/webhook?data.id=123", { method: "POST", headers: { ...h, "x-signature": "ts=1,v1=" + "0".repeat(64), "x-request-id": "r" }, body: "{{no json" });
    rec("A10.1a", "Webhook MP con cuerpo no JSON y firma inválida: error genérico", (r4.status === 401 || r4.status === 503) && !/stack|at \w+|supabase/i.test(await r4.text()), `HTTP ${r4.status}`);
  }
  // CSRF server actions
  {
    const r = await http("/protected/alumnos", { cookie: cA, method: "POST", headers: { origin: "https://evil.example", "next-action": "deadbeef00000000000000000000000000000000", "content-type": "text/plain;charset=UTF-8" }, body: "[]" });
    const t = await r.text();
    results.push({ id: "A08.2", nombre: "POST de server action con Origin ajeno y action id falso (dev; INCONCLUSA: el id falso se rechaza antes que el Origin)", resultado: "INFO", evidencia: `HTTP ${r.status}` });
  }
  // A10 errores
  {
    const r = await http("/ruta-que-no-existe-" + tag, { cookie: cA });
    const t = await r.text();
    const mm = t.match(/\/Users\/[^"<\s]{0,60}|at [^<\n]{0,40}\(\/.*?:\d+:\d+\)/);
    rec("A10.1b", "404 genérico sin rutas internas (modo dev)", r.status === 404 && !mm, `HTTP ${r.status} ${mm ? "coincidencia: " + mm[0] : ""}`);
    const r2 = await http("/api/export/alumnos?format=<script>", { cookie: cA });
    const t2 = await r2.text();
    rec("A10.1c", "format inválido: error controlado sin reflejar la entrada", r2.status === 400 && !t2.includes("<script>"), `HTTP ${r2.status} ${t2.slice(0, 80)}`);
    const r3 = await http("/api/export/alumno-progreso?alumno='&anio=abc", { cookie: cA });
    rec("A10.1d", "alumno-progreso con parámetros basura", r3.status === 400, `HTTP ${r3.status}`);
    const r4 = await http("/api/export/alumno-progreso?alumno=%27%20or%201=1--&anio=2026", { cookie: cA });
    const t4 = await r4.text();
    rec("A10.1e", "alumno-progreso con 'alumno' = inyección SQL clásica: no 500 ni detalles SQL", r4.status !== 500 && !/syntax|postgres|pgrst|invalid input/i.test(t4), `HTTP ${r4.status} ${t4.slice(0, 80)}`);
    const big = new FormData(); big.append("archivo", new File([Buffer.alloc(5 * 1024 * 1024 + 100)], "x.xlsx"));
    const r5 = await http("/api/alumnos/carga-masiva", { cookie: cA, method: "POST", body: big });
    rec("A06.3a", "Carga masiva > 5 MB", r5.status === 400 || r5.status === 413, `HTTP ${r5.status}`);
    const mal = new FormData(); mal.append("archivo", new File([Buffer.from("no es un xlsx")], "x.xlsx"));
    const r6 = await http("/api/alumnos/carga-masiva", { cookie: cA, method: "POST", body: mal });
    rec("A08.3d", "Carga masiva con .xlsx corrupto: error 400 controlado", r6.status === 400, `HTTP ${r6.status} ${(await r6.text()).slice(0, 80)}`);
    const exe = new FormData(); exe.append("archivo", new File([Buffer.from("MZ")], "x.exe"));
    const r7 = await http("/api/alumnos/carga-masiva", { cookie: cA, method: "POST", body: exe });
    rec("A08.3e", "Carga masiva con extensión .exe", r7.status === 400, `HTTP ${r7.status}`);
  }
  // Públicas
  {
    for (const p of ["/robots.txt", "/sitemap.xml", `/g/sec-${tag}-a`]) {
      const r = await http(p);
      results.push({ id: `A02.5-${p}`, nombre: `Pública ${p}`, resultado: "INFO", evidencia: `HTTP ${r.status}` });
    }
    const r = await http("/.env"); const r2 = await http("/_next/static/../../.env");
    rec("A02.5b", "Archivos sensibles (.env) no servidos", r.status !== 200 && r2.status !== 200, `HTTP ${r.status}/${r2.status}`);
    const r3 = await http("/auth/login"); const html = await r3.text();
    const filtra = [SVC, process.env.MP_ACCESS_TOKEN_VALINOR, process.env.MP_WEBHOOK_SECRET, process.env.MP_ACCESS_TOKEN_ANTONIO, process.env.MP_WEBHOOK_SECRET_ANTONIO].filter(Boolean).some((s) => html.includes(s));
    rec("A02.5c", "Secretos de servidor ausentes del HTML de /auth/login", !filtra, filtra ? "SECRETO PRESENTE" : "ninguno presente");
  }
}

async function limpiar() {
  const resto = [];
  for (const [bucket, path] of created.paths) await admin.storage.from(bucket).remove([path]).catch(() => {});
  // comprobantes y carpetas: limpiar por prefijo
  for (const uid of created.users) {
    for (const g of created.gyms) {
      const l = await admin.storage.from("comprobantes-pago").list(`${g}/${uid}`).catch(() => null);
      if (l?.data?.length) await admin.storage.from("comprobantes-pago").remove(l.data.map((o) => `${g}/${uid}/${o.name}`));
    }
  }
  for (const g of created.gyms) {
    for (const b of ["sitio-imagenes"]) {
      const l = await admin.storage.from(b).list(g).catch(() => null);
      if (l?.data?.length) await admin.storage.from(b).remove(l.data.map((o) => `${g}/${o.name}`));
    }
  }
  for (const u of created.users) await admin.from("eventos_seguridad").delete().eq("usuario_id", u);
  for (const g of created.gyms) await admin.from("eventos_seguridad").delete().eq("gimnasio_id", g);
  for (const g of created.gyms) await admin.from("gimnasios").delete().eq("id", g);
  for (const u of created.users) await admin.auth.admin.deleteUser(u);
  // verificación
  const { data: gs } = await admin.from("gimnasios").select("id").like("slug", `sec-${tag}%`);
  const { data: us } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const ru = (us?.users ?? []).filter((u) => u.email?.includes(`sec-${tag}`) || u.email?.includes(`weak-${tag}`));
  const { data: al } = await admin.from("alumnos").select("id").like("apellidos", `Sec${tag}%`);
  if (gs?.length) resto.push(`gimnasios:${gs.length}`);
  if (ru.length) resto.push(`usuarios:${ru.length}`);
  if (al?.length) resto.push(`alumnos:${al.length}`);
  rec("LIMPIEZA", "No quedan restos de datos de prueba", resto.length === 0, resto.join(", ") || "sin restos");
}

try {
  await main();
} catch (e) {
  console.error("ERROR EN LA EJECUCIÓN:", e.message);
  results.push({ id: "ERROR", nombre: "Excepción en la ejecución", resultado: "FAIL", evidencia: e.message });
} finally {
  await limpiar();
  writeFileSync(OUT, JSON.stringify({ fecha: new Date().toISOString(), tag, resultados: results }, null, 2));
  const f = results.filter((r) => r.resultado === "FAIL").length;
  console.log(`\nTotal ${results.length} · PASS ${results.filter((r) => r.resultado === "PASS").length} · FAIL ${f} · INFO ${results.filter((r) => r.resultado === "INFO").length}`);
}
