"use client";

import { LogOut } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();

  const logout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
  };

  return (
    <Button
      onClick={logout}
      variant="ghost"
      size="sm"
      className="w-full justify-start gap-3 rounded-[9px] px-3.5 text-muted-foreground"
    >
      <LogOut className="h-4 w-4" />
      Cerrar sesión
    </Button>
  );
}
