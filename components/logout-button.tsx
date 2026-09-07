"use client";

import { LogOut } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();

  const logout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
  };

  return (
    <button
      type="button"
      onClick={logout}
      className="inline-flex items-center justify-center gap-2 rounded-full border border-border bg-primary/10 px-4 py-2 text-[0.7rem] font-medium uppercase tracking-wide text-secondary-foreground transition-colors hover:bg-primary/20"
    >
      <LogOut className="h-3.5 w-3.5" />
      Cerrar sesión
    </button>
  );
}
