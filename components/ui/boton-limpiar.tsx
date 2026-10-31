import Link from "next/link";

import { Button } from "@/components/ui/button";

/**
 * Botón "Limpiar" del estándar de filtros (spec 50): siempre visible, habilitado solo si hay
 * algún filtro aplicado. Con `href` navega (filtros en la URL); con `onClick` limpia estado local.
 */
export function BotonLimpiar({
  activo,
  href,
  onClick,
}: {
  activo: boolean;
  href?: string;
  onClick?: () => void;
}) {
  if (!activo) {
    return (
      <Button type="button" variant="ghost" disabled>
        Limpiar
      </Button>
    );
  }
  if (href) {
    return (
      <Button asChild variant="ghost">
        <Link href={href}>Limpiar</Link>
      </Button>
    );
  }
  return (
    <Button type="button" variant="ghost" onClick={onClick}>
      Limpiar
    </Button>
  );
}
