"use client";

import { CalendarDays, CreditCard, Dumbbell, LayoutDashboard, Ruler, Salad } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const items = [
  { href: "/portal", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/portal/turnos", label: "Mis turnos", icon: CalendarDays },
  { href: "/portal/bitacora", label: "Bitácora", icon: Dumbbell },
  { href: "/portal/nutricion", label: "Nutrición", icon: Salad },
  { href: "/portal/medicion-corporal", label: "Medición corporal", icon: Ruler },
  { href: "/portal/pagar-plan", label: "Plan", icon: CreditCard },
];

export function PortalNav({ nutricion, medicionCorporal }: { nutricion: boolean; medicionCorporal: boolean }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1">
      {items
        .filter((item) => nutricion || item.href !== "/portal/nutricion")
        .filter((item) => medicionCorporal || item.href !== "/portal/medicion-corporal")
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
