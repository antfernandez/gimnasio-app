import { redirect } from "next/navigation";

// Sprint 12: el dueño ya no se autoregistra (solo el Superadmin crea cuentas de
// Admin, ver Parte C) — el único autorregistro que queda es el de alumno, así que
// ya no hace falta un selector de rol acá.
export default function Page() {
  redirect("/auth/sign-up/alumno");
}
