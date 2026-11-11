"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const items = [
  {
    href: "/protected/nutricion/alimentos",
    label: "Alimentos",
    cta: {
      label: "Nuevo alimento",
      href: "/protected/nutricion/alimentos?nuevo=1",
    },
  },
  {
    href: "/protected/nutricion/recetas",
    label: "Recetas",
    cta: { label: "Nueva receta", href: "/protected/nutricion/recetas/nueva" },
  },
  {
    href: "/protected/nutricion/planes",
    label: "Planes",
    cta: {
      label: "Nuevo plan nutricional",
      href: "/protected/nutricion/planes/nuevo",
    },
  },
  {
    href: "/protected/nutricion/asignar",
    label: "Asignar alumno",
    cta: {
      label: "Asignar alumno",
      href: "/protected/nutricion/asignar?nuevo=1",
    },
  },
];

/**
 * Pestañas de navegación del módulo Nutrición (spec 80): el botón de crear de cada sección
 * va en la misma fila, alineado a la derecha; solo se muestra en el listado (no en formularios).
 */
export function NutricionSubnav() {
  const pathname = usePathname();
  const cta = items.find((item) => pathname === item.href)?.cta;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <nav className="flex flex-wrap gap-2">
        {items.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-full border px-4 py-1.5 text-sm transition-colors",
                active
                  ? "border-primary bg-primary/15 text-secondary-foreground"
                  : "border-border text-muted-foreground hover:border-primary hover:text-secondary-foreground",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      {cta && (
        <Button asChild size="sm" className="ml-auto">
          <Link href={cta.href}>
            <Plus className="h-3.5 w-3.5" />
            {cta.label}
          </Link>
        </Button>
      )}
    </div>
  );
}
