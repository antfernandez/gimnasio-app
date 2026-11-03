"use client";

import { X } from "lucide-react";
import { useActionState, useEffect, useRef, useState } from "react";

import { updateContactoAlumno } from "@/app/portal/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { limpiarTelefono, validarEmail, validarTelefono } from "@/lib/contacto";

type Props = {
  email: string | null;
  telefono: string | null;
};

/** Spec 58: link "Editar" del indicador de datos de contacto; abre un modal con
 * teléfono y correo y se cierra al guardar. */
export function ContactoDialog({ email, telefono }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const [state, formAction, isPending] = useActionState(updateContactoAlumno, {});

  const [tel, setTel] = useState(telefono ?? "");
  const [mail, setMail] = useState(email ?? "");
  const errorTel = validarTelefono(tel.trim());
  const errorMail = validarEmail(mail.trim());

  useEffect(() => {
    if (state.ok) ref.current?.close();
  }, [state]);

  return (
    <>
      <button
        type="button"
        onClick={() => ref.current?.showModal()}
        className="text-xs text-muted-foreground hover:text-primary hover:underline"
      >
        Editar
      </button>
      <dialog
        ref={ref}
        onClick={(e) => {
          if (e.target === ref.current) ref.current?.close();
        }}
        className="m-auto w-[min(92vw,420px)] rounded-[12px] border border-border bg-card p-6 text-card-foreground backdrop:bg-black/50"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <h3 className="text-base font-semibold">Datos de contacto</h3>
          <button
            type="button"
            aria-label="Cerrar"
            onClick={() => ref.current?.close()}
            className="rounded-full p-1 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <form action={formAction} className="flex flex-col gap-4">
          <div className="grid gap-2">
            <Label htmlFor="contacto-telefono">Teléfono</Label>
            <Input
              id="contacto-telefono"
              name="telefono"
              type="tel"
              placeholder="+56 9 0000 0000"
              inputMode="tel"
              maxLength={20}
              value={tel}
              onChange={(e) => setTel(limpiarTelefono(e.target.value))}
              aria-invalid={Boolean(errorTel)}
            />
            {errorTel && <p className="text-xs text-destructive">{errorTel}</p>}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="contacto-email">Correo electrónico</Label>
            <Input
              id="contacto-email"
              name="email"
              type="email"
              placeholder="tu@correo.cl"
              maxLength={200}
              value={mail}
              onChange={(e) => setMail(e.target.value)}
              aria-invalid={Boolean(errorMail)}
            />
            {errorMail && <p className="text-xs text-destructive">{errorMail}</p>}
          </div>
          {state.error && <p className="text-sm text-destructive">{state.error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => ref.current?.close()}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending || Boolean(errorTel) || Boolean(errorMail)}>
              {isPending ? "Guardando…" : "Guardar"}
            </Button>
          </div>
        </form>
      </dialog>
    </>
  );
}
