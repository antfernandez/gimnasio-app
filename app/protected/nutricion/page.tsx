import { redirect } from "next/navigation";

// Spec 51: se eliminó la sección "Panel"; Nutrición abre en "Asignar alumno".
export default function NutricionPage() {
  redirect("/protected/nutricion/asignar");
}
