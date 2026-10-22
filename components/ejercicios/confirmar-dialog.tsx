"use client";

import { useEffect, useRef } from "react";

import { Button } from "@/components/ui/button";

type Props = {
  open: boolean;
  titulo: string;
  descripcion: string;
  confirmLabel: string;
  pending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

/** Diálogo de confirmación sobre el `<dialog>` nativo (sin dependencia extra):
 * maneja foco, Escape y capa modal por sí solo. */
export function ConfirmarDialog({
  open,
  titulo,
  descripcion,
  confirmLabel,
  pending,
  onConfirm,
  onCancel,
}: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onCancel}
      className="m-auto w-[min(92vw,26rem)] rounded-[9px] border border-border bg-card p-6 text-foreground backdrop:bg-black/60"
    >
      <h3 className="text-lg">{titulo}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{descripcion}</p>
      <div className="mt-6 flex justify-end gap-3">
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>
          Cancelar
        </Button>
        <Button
          type="button"
          variant="destructive"
          size="sm"
          disabled={pending}
          onClick={onConfirm}
        >
          {pending ? "Eliminando…" : confirmLabel}
        </Button>
      </div>
    </dialog>
  );
}
