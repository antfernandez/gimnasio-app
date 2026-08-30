"use client";

import { useTransition } from "react";

import { setMercadoPagoHabilitado } from "@/app/protected/pagos/actions";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

export function MercadoPagoToggle({ habilitado }: { habilitado: boolean }) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-2">
      <Checkbox
        id="mercado_pago_habilitado"
        checked={habilitado}
        disabled={isPending}
        onCheckedChange={(v) =>
          startTransition(() => setMercadoPagoHabilitado(v === true))
        }
      />
      <Label htmlFor="mercado_pago_habilitado" className="cursor-pointer">
        Habilitar Mercado Pago como medio de cobro
      </Label>
    </div>
  );
}
