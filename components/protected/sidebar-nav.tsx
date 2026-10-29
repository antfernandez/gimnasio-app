"use client";

import {
  BarChart3,
  CalendarDays,
  ClipboardCheck,
  ClipboardList,
  CreditCard,
  Dumbbell,
  Globe,
  KeyRound,
  Receipt,
  ListChecks,
  NotebookPen,
  Salad,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

// Sprint 22, Parte B: "Hoy" y "Dashboard" (dos rutas separadas desde el
// Sprint 19, Parte 3) se fusionaron de vuelta en una sola página/ítem —
// "Dashboard" queda al principio del menú porque es la página de aterrizaje
// del dueño (agenda del día + métricas), no al final como vista bajo demanda.
const items = [
  { href: "/protected", label: "Dashboard", icon: BarChart3, exact: true },
  { href: "/protected/bitacora", label: "Bitácora", icon: NotebookPen },
  { href: "/protected/alumnos", label: "Alumnos", icon: Users },
  { href: "/protected/rutinas", label: "Rutinas", icon: Dumbbell },
  // Catálogo de ejercicios: solo lo gestiona el dueño (el entrenador lo lee desde
  // el selector de rutinas).
  { href: "/protected/ejercicios", label: "Ejercicios", icon: ListChecks, soloDueno: true },
  // Spec 24: alimentos, recetas, planes nutricionales y su asignación a alumnos.
  { href: "/protected/nutricion", label: "Nutrición", icon: Salad },
  { href: "/protected/turnos", label: "Turnos", icon: CalendarDays },
  { href: "/protected/asistencias", label: "Asistencias", icon: ClipboardCheck },
  { href: "/protected/pagos", label: "Pagos", icon: CreditCard },
  { href: "/protected/planes", label: "Planes", icon: ClipboardList },
  // Spec 22: permisos de los alumnos (hoy avances y bitácora propios).
  { href: "/protected/permisos", label: "Permisos", icon: KeyRound },
  { href: "/protected/sitio", label: "Sitio público", icon: Globe },
  // Spec 23, flujo B: la dueña paga la suscripción al sistema.
  { href: "/protected/pagar-plan", label: "Suscripción", icon: Receipt, soloDueno: true },
];

export function SidebarNav({ esDueno = false }: { esDueno?: boolean }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1">
      {items
        .filter((item) => esDueno || !item.soloDueno)
        .map((item) => {
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
                ? "bg-gradient-to-br from-primary/30 to-primary/10 text-secondary-foreground shadow-[inset_3px_0_0_hsl(var(--primary))]"
                : "text-foreground/80 hover:bg-primary/20 hover:text-secondary-foreground",
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
