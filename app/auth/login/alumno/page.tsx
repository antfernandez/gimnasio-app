import { LoginForm } from "@/components/login-form";

// El aviso de gimnasio congelado depende de `searchParams` (mismo patrón que el login de dueño).
export const instant = false;

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ congelado?: string }>;
}) {
  const { congelado } = await searchParams;
  return (
    <div className="flex flex-col gap-4">
      {congelado === "1" && (
        <p className="mx-auto max-w-sm text-center text-sm text-destructive">
          Tu gimnasio tiene la suscripción vencida o fue dado de baja. Consulta en tu gimnasio.
        </p>
      )}
      <LoginForm tipo="alumno" />
    </div>
  );
}
