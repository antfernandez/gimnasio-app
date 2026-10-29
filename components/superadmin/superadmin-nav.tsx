"use client";

import { BarChart3, Building2, ClipboardList, CreditCard } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const items = [
  { href: "/superadmin", label: "Dashboard", icon: BarChart3, exact: true },
  { href: "/superadmin/gimnasios", label: "Gimnasios", icon: Building2 },
  { href: "/superadmin/pagos", label: "Pagos", icon: CreditCard },
  { href: "/superadmin/planes", label: "Planes", icon: ClipboardList },
];

export function SuperadminNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1">
      {items.map((item) => {
        const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
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
