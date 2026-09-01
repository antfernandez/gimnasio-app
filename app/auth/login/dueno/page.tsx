import { LoginForm } from "@/components/login-form";

// El banner de "dado de baja" depende de `searchParams` — sin esto Next intenta
// prerenderizar la ruta estáticamente y falla (mismo patrón que /protected/layout.tsx).
export const instant = false;

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ baja?: string }>;
}) {
  const { baja } = await searchParams;
  return (
    <div className="flex flex-col gap-4">
      {baja === "1" && (
        <p className="mx-auto max-w-sm text-center text-sm text-destructive">
          Tu cuenta de gimnasio fue dada de baja. Contacta al equipo de Valinor si
          crees que es un error.
        </p>
      )}
      <LoginForm tipo="dueno" />
    </div>
  );
}
