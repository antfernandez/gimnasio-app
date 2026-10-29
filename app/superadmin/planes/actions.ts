"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import type { FuncionSistema } from "@/lib/planes-sistema";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSuperadminActual } from "@/lib/superadmin";

export type PlanFormState = { error?: string; ok?: string };

// Cada server action verifica al llamante: el layout solo gatea la navegación.
async function requireSuperadmin() {
  const superadmin = await getSuperadminActual();
  if (!superadmin) redirect("/auth/login/superadmin");
  return superadmin;
}

const FECHA = /^\d{4}-\d{2}-\d{2}$/;

function revalidar() {
  revalidatePath("/superadmin/planes");
  revalidatePath("/superadmin/gimnasios");
  revalidatePath("/protected/pagar-plan");
}

/** Una función por línea con formato `Título: detalle`. */
function leerFunciones(texto: string): FuncionSistema[] {
  return texto
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const i = l.indexOf(":");
      return i === -1
        ? { titulo: l, detalle: "" }
        : { titulo: l.slice(0, i).trim(), detalle: l.slice(i + 1).trim() };
    });
}

function diaAnterior(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

interface DatosPlan {
  nombre: string;
  maxAlumnos: number | null;
  descripcion: string | null;
  caracteristicas: FuncionSistema[];
  orden: number;
}

function leerDatosPlan(formData: FormData): DatosPlan | { error: string } {
  const nombre = String(formData.get("nombre") ?? "").trim();
  const maxTxt = String(formData.get("max_alumnos") ?? "").trim();
  const maxAlumnos = maxTxt === "" ? null : Number(maxTxt);
  const orden = Number(formData.get("orden") ?? 0);
  if (!nombre) return { error: "El nombre es obligatorio." };
  if (maxAlumnos !== null && (!Number.isInteger(maxAlumnos) || maxAlumnos <= 0)) {
    return { error: "El tope de alumnos debe ser un entero mayor a 0 o quedar vacío." };
  }
  if (!Number.isInteger(orden)) return { error: "El orden debe ser un entero." };
  return {
    nombre,
    maxAlumnos,
    descripcion: String(formData.get("descripcion") ?? "").trim() || null,
    caracteristicas: leerFunciones(String(formData.get("funciones") ?? "")),
    orden,
  };
}

function leerPrecio(
  formData: FormData,
): { neto: number; iva: number } | { error: string } {
  const neto = Number(formData.get("precio_neto"));
  const iva = Number(formData.get("iva_pct"));
  if (!Number.isFinite(neto) || neto <= 0) return { error: "El precio neto debe ser mayor a 0." };
  if (!Number.isFinite(iva) || iva < 0 || iva > 100) return { error: "El IVA debe estar entre 0 y 100." };
  return { neto, iva };
}

export async function crearPlan(_prev: PlanFormState, formData: FormData): Promise<PlanFormState> {
  await requireSuperadmin();
  const datos = leerDatosPlan(formData);
  if ("error" in datos) return datos;
  const precio = leerPrecio(formData);
  if ("error" in precio) return precio;

  const desde = String(formData.get("vigente_desde") ?? "");
  const hasta = String(formData.get("vigente_hasta") ?? "");
  if (!FECHA.test(desde)) return { error: "Indica desde cuándo rige el plan." };
  if (hasta && (!FECHA.test(hasta) || hasta < desde)) {
    return { error: "El término de vigencia no puede ser anterior al inicio." };
  }

  const admin = createAdminClient();
  const { data: mismos } = await admin
    .from("planes_sistema")
    .select("vigente_desde, vigente_hasta")
    .ilike("nombre", datos.nombre);
  const solapa = (mismos ?? []).some(
    (p) =>
      (!hasta || p.vigente_desde <= hasta) && (!p.vigente_hasta || p.vigente_hasta >= desde),
  );
  if (solapa) return { error: "Ya existe un plan con ese nombre y vigencia solapada." };

  const { error } = await admin.from("planes_sistema").insert({
    nombre: datos.nombre,
    max_alumnos: datos.maxAlumnos,
    precio_mensual: precio.neto,
    iva_pct: precio.iva,
    descripcion: datos.descripcion,
    caracteristicas: datos.caracteristicas,
    orden: datos.orden,
    vigente_desde: desde,
    vigente_hasta: hasta || null,
  });
  if (error) return { error: "No se pudo crear el plan." };
  revalidar();
  return { ok: "Plan creado." };
}

/** Edita datos descriptivos y estado; el precio NO se sobrescribe (ver `cambiarPrecioPlan`). */
export async function editarPlan(
  id: string,
  _prev: PlanFormState,
  formData: FormData,
): Promise<PlanFormState> {
  await requireSuperadmin();
  const datos = leerDatosPlan(formData);
  if ("error" in datos) return datos;

  const { error } = await createAdminClient()
    .from("planes_sistema")
    .update({
      nombre: datos.nombre,
      max_alumnos: datos.maxAlumnos,
      descripcion: datos.descripcion,
      caracteristicas: datos.caracteristicas,
      orden: datos.orden,
      activo: formData.get("activo") === "on",
    })
    .eq("id", id);
  if (error) return { error: "No se pudo guardar el plan." };
  revalidar();
  return { ok: "Plan guardado." };
}

/**
 * Un cambio de precio crea una fila nueva y cierra la anterior el día previo, para
 * conservar el historial de lo cobrado (spec 41 §2.4).
 */
export async function cambiarPrecioPlan(
  id: string,
  _prev: PlanFormState,
  formData: FormData,
): Promise<PlanFormState> {
  await requireSuperadmin();
  const precio = leerPrecio(formData);
  if ("error" in precio) return precio;
  const desde = String(formData.get("vigente_desde") ?? "");
  if (!FECHA.test(desde)) return { error: "Indica desde cuándo rige el nuevo precio." };

  const admin = createAdminClient();
  const { data: actual } = await admin.from("planes_sistema").select("*").eq("id", id).maybeSingle();
  if (!actual) return { error: "El plan no existe." };
  if (desde <= actual.vigente_desde) {
    return { error: "El nuevo precio debe regir después del inicio del precio actual." };
  }

  const { error: insError } = await admin.from("planes_sistema").insert({
    nombre: actual.nombre,
    max_alumnos: actual.max_alumnos,
    precio_mensual: precio.neto,
    iva_pct: precio.iva,
    descripcion: actual.descripcion,
    caracteristicas: actual.caracteristicas,
    orden: actual.orden,
    activo: actual.activo,
    vigente_desde: desde,
    vigente_hasta: null,
  });
  if (insError) return { error: "No se pudo crear el nuevo precio." };

  // Si el actual ya terminaba antes del nuevo, queda como está.
  if (!actual.vigente_hasta || actual.vigente_hasta >= desde) {
    await admin.from("planes_sistema").update({ vigente_hasta: diaAnterior(desde) }).eq("id", id);
  }
  revalidar();
  return { ok: "Nuevo precio registrado; el anterior queda en el historial." };
}
