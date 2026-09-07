"use client";

import {
  BarChart3,
  CalendarDays,
  ClipboardList,
  CreditCard,
  Dumbbell,
  Globe,
  NotebookPen,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

// Sprint 22, Parte B: "Hoy" y "Estadísticas" (dos rutas separadas desde el
// Sprint 19, Parte 3) se fusionaron de vuelta en una sola página/ítem —
// "Estadísticas" queda al principio del menú porque es la página de aterrizaje
// del dueño (agenda del día + métricas), no al final como vista bajo demanda.
const items = [
  { href: "/protected", label: "Estadísticas", icon: BarChart3, exact: true },
  { href: "/protected/bitacora", label: "Bitácora", icon: NotebookPen },
  { href: "/protected/alumnos", label: "Alumnos", icon: Users },
  { href: "/protected/rutinas", label: "Rutinas", icon: Dumbbell },
  { href: "/protected/turnos", label: "Turnos", icon: CalendarDays },
  { href: "/protected/pagos", label: "Pagos", icon: CreditCard },
  { href: "/protected/planes", label: "Planes", icon: ClipboardList },
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
