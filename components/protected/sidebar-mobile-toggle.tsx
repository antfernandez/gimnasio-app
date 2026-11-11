"use client";

import { Menu, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Sprint 18, Parte 7: en celular, el bloque de usuario + nav completo (Sprint 15,
 * Parte E) ocupaba toda la pantalla antes de llegar al contenido — un coach
 * parado en el gimnasio tenía que scrollear pasando el logo, avatar y 9 ítems de
 * menú solo para ver la Bitácora. Colapsado por defecto en `md:hidden`, con un
 * botón para abrirlo cuando sí hace falta cambiar de sección; en escritorio
 * (`md:`) se ignora el estado y siempre queda visible, sin cambios. */
export function SidebarMobileToggle({
  brand,
  children,
}: {
  brand: React.ReactNode;
  children: React.ReactNode;
}) {
  const [abierto, setAbierto] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setAbierto(false);
  }, [pathname]);

  const cerrarAlHacerClickEnLink = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("a")) {
      setAbierto(false);
    }
  };

  /* Spec 73: en mobile el header es una fila de alto fijo (logo + "Menú"), sticky; el
   * menú se despliega como panel superpuesto bajo el header, sin empujar el contenido
   * ni cambiar el alto del header. En `md:` el aside es la barra lateral de siempre. */
  return (
    <>
      <div className="flex h-[72px] items-center justify-between gap-3 md:mb-8 md:h-auto">
        {brand}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setAbierto((v) => !v)}
          aria-expanded={abierto}
          className="shrink-0 gap-2 md:hidden"
        >
          {abierto ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          Menú
        </Button>
      </div>
      <div
        onClick={cerrarAlHacerClickEnLink}
        className={cn(
          abierto ? "block" : "hidden",
          "absolute inset-x-0 top-full max-h-[calc(100svh-72px)] overflow-y-auto border-b border-border bg-[hsl(33_50%_86%)] px-5 pb-5 pt-4 shadow-lg",
          "md:static md:block md:max-h-none md:overflow-visible md:border-0 md:p-0 md:shadow-none",
        )}
      >
        {children}
      </div>
    </>
  );
}
