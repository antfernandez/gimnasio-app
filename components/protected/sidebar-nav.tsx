"use client";

import {
  BarChart3,
  CalendarDays,
  ClipboardList,
  CreditCard,
  Dumbbell,
  Globe,
  NotebookPen,
  Sun,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

// Sprint 19, Parte 3: reordenado según la frecuencia de uso real de un coach
// (auditoría UX 2026-09-04, sección 6) — Hoy y Bitácora primero (uso diario en
// clase), Estadísticas (antes "Dashboard" de métricas) baja al final como vista de
// análisis bajo demanda, y "Pendientes de aprobación" se fusiona como badge dentro
// de Alumnos en vez de ocupar un ítem fijo del menú (Sprint 19, Parte 4).
const items = [
  { href: "/protected", label: "Hoy", icon: Sun, exact: true },
  { href: "/protected/bitacora", label: "Bitácora", icon: NotebookPen },
  { href: "/protected/alumnos", label: "Alumnos", icon: Users },
  { href: "/protected/rutinas", label: "Rutinas", icon: Dumbbell },
  { href: "/protected/turnos", label: "Turnos", icon: CalendarDays },
  { href: "/protected/pagos", label: "Pagos", icon: CreditCard },
  { href: "/protected/planes", label: "Planes", icon: ClipboardList },
  { href: "/protected/estadisticas", label: "Estadísticas", icon: BarChart3 },
  { href: "/protected/sitio", label: "Sitio público", icon: Globe },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1">
      {items.map((item) => {
        const active = item.exact
          ? pathname === item.href
          : pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-[9px] px-3.5 py-2.5 text-sm transition-all",
              active
                ? "bg-gradient-to-br from-primary/20 to-primary/5 text-secondary-foreground shadow-[inset_3px_0_0_hsl(var(--primary))]"
                : "text-muted-foreground hover:bg-primary/10 hover:text-secondary-foreground",
            )}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
