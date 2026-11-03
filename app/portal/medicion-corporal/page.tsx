import { redirect } from "next/navigation";

// Contenido dinámico por usuario (sesión y datos del gimnasio); mismo criterio que el layout.
export const instant = false;

/** Spec 59: Medición corporal ya no es un módulo; vive en la sección de Progreso. */
export default function PortalMedicionCorporalPage() {
  redirect("/portal/progreso?tab=medicion");
}
