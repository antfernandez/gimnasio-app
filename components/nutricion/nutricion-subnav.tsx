"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const items = [
  { href: "/protected/nutricion", label: "Panel", exact: true },
  { href: "/protected/nutricion/alimentos", label: "Alimentos" },
  { href: "/protected/nutricion/recetas", label: "Recetas" },
  { href: "/protected/nutricion/planes", label: "Planes" },
  { href: "/protected/nutricion/asignar", label: "Asignar alumno" },
];

/** Pestañas de navegación entre las secciones del módulo Nutrición. */
export function NutricionSubnav() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-wrap gap-2">
      {items.map((item) => {
        const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
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
  );
}
