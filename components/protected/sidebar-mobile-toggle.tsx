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
export function SidebarMobileToggle({ children }: { children: React.ReactNode }) {
  const [abierto, setAbierto] = useState(false);
  const pathname = usePathname();

  // Cierra el menú al navegar a otra pantalla — el layout no se remonta entre
  // rutas de `/protected/*`, así que sin esto el menú quedaba abierto tapando la
  // pantalla después de tocar un ítem.
  useEffect(() => {
    setAbierto(false);
  }, [pathname]);

  return (
    <>
      <div className="flex items-center justify-end md:hidden">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setAbierto((v) => !v)}
          className="gap-2"
        >
          {abierto ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          {abierto ? "Cerrar menú" : "Menú"}
        </Button>
      </div>
      <div className={cn(abierto ? "block" : "hidden", "md:block")}>{children}</div>
    </>
  );
}
