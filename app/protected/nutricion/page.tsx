import { redirect } from "next/navigation";

// Contenido dinámico por usuario (sesión y datos del gimnasio); mismo criterio que el layout.
export const instant = false;

// Spec 51: se eliminó la sección "Panel"; Spec 76: Nutrición abre en "Alimentos".
export default function NutricionPage() {
  redirect("/protected/nutricion/alimentos");
}
