"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { slugify, withRandomSuffix } from "@/lib/slug";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSuperadminActual } from "@/lib/superadmin";

const UNIQUE_VIOLATION = "23505";
const MAX_SLUG_ATTEMPTS = 5;

/**
 * Verifica al llamante en CADA server action, no solo en el layout — el layout
 * gatea la navegación, pero un server action se puede invocar directo. Usa el
 * cliente normal (RLS), nunca el `service_role`, para esta verificación.
 */
async function requireSuperadmin() {
  const superadmin = await getSuperadminActual();
  if (!superadmin) redirect("/auth/login/superadmin");
  return superadmin;
}

export type CrearAdminFormState = { error?: string; ok?: boolean };

/**
 * Crea la cuenta de Admin/dueño completa: usuario en `auth.users` + fila en
 * `gimnasios` + fila en `perfiles`, todo con el cliente `service_role` (Parte C:
 * "solo el Superadmin puede crear cuentas de Admin"). No hay envío de correo en
 * este proyecto (no hay integración de Resend, ver memoria del proyecto) — el
 * Superadmin comparte la contraseña inicial con el dueño por un canal aparte.
 */
export async function crearAdmin(
  _prevState: CrearAdminFormState,
  formData: FormData,
): Promise<CrearAdminFormState> {
  await requireSuperadmin();

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const nombreCompleto = String(formData.get("nombre_completo") ?? "").trim();
  const nombreGimnasio = String(formData.get("nombre_gimnasio") ?? "").trim();

  if (!email || !password || !nombreCompleto || !nombreGimnasio) {
    return { error: "Todos los campos son obligatorios." };
  }
  if (password.length < 6) {
    return { error: "La contraseña debe tener al menos 6 caracteres." };
  }

  const admin = createAdminClient();

  const { data: userData, error: userError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      nombre_completo: nombreCompleto,
      nombre_gimnasio: nombreGimnasio,
    },
  });
  if (userError || !userData.user) {
    return { error: userError?.message ?? "No se pudo crear la cuenta." };
  }

  const gimnasioId = crypto.randomUUID();
  const baseSlug = slugify(nombreGimnasio);
  let slug = baseSlug;
  let gimError: { code?: string; message: string } | null = null;
  for (let attempt = 0; attempt < MAX_SLUG_ATTEMPTS; attempt++) {
    const { error } = await admin
      .from("gimnasios")
      .insert({ id: gimnasioId, nombre: nombreGimnasio, slug });
    gimError = error;
    if (!error || error.code !== UNIQUE_VIOLATION) break;
    slug = withRandomSuffix(baseSlug);
  }
  if (gimError) {
    return {
      error: `Se creó el usuario pero no se pudo crear el gimnasio: ${gimError.message}`,
    };
  }

  const { error: perfilError } = await admin.from("perfiles").insert({
    id: userData.user.id,
    gimnasio_id: gimnasioId,
    nombre_completo: nombreCompleto,
    rol: "dueño",
  });
  if (perfilError) {
    return {
      error: `Se creó el gimnasio pero no se pudo crear el perfil: ${perfilError.message}`,
    };
  }

  revalidatePath("/superadmin");
  return { ok: true };
}

/** "Dar de baja" (Parte C): el dueño deja de poder operar el panel — ver el chequeo
 * de `gimnasio.estado` en `app/protected/layout.tsx`. No se borra nada. */
export async function darDeBajaAdmin(gimnasioId: string) {
  await requireSuperadmin();
  const admin = createAdminClient();
  await admin.from("gimnasios").update({ estado: "cancelado" }).eq("id", gimnasioId);
  revalidatePath("/superadmin");
}

export async function reactivarAdmin(gimnasioId: string) {
  await requireSuperadmin();
  const admin = createAdminClient();
  await admin.from("gimnasios").update({ estado: "activo" }).eq("id", gimnasioId);
  revalidatePath("/superadmin");
}

export async function editarAdmin(formData: FormData) {
  await requireSuperadmin();
  const perfilId = String(formData.get("perfil_id") ?? "");
  const gimnasioId = String(formData.get("gimnasio_id") ?? "");
  const nombreCompleto = String(formData.get("nombre_completo") ?? "").trim();
  const nombreGimnasio = String(formData.get("nombre_gimnasio") ?? "").trim();
  if (!perfilId || !gimnasioId || !nombreCompleto || !nombreGimnasio) return;

  const admin = createAdminClient();
  await admin.from("perfiles").update({ nombre_completo: nombreCompleto }).eq("id", perfilId);
  await admin.from("gimnasios").update({ nombre: nombreGimnasio }).eq("id", gimnasioId);
  revalidatePath("/superadmin");
}
