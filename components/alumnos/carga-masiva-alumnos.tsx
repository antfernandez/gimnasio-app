"use client";

import { Download, Upload } from "lucide-react";
import { useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { EstadoFila } from "@/lib/carga-alumnos";

type Fila = {
  fila: number;
  rut: string;
  nombre: string;
  estado: EstadoFila;
  motivos: string[];
};

type Validacion = {
  filas: Fila[];
  resumen: { validas: number; actualizar: number; errores: number; duplicadas: number };
  bloqueo: string | null;
};

type Resultado = {
  carga_id: string;
  creados: number;
  actualizados: number;
  omitidos: number;
  con_error: number;
};

const ETIQUETA: Record<EstadoFila, string> = {
  valida: "Válida",
  error: "Con error",
  duplicada: "Duplicada",
  actualizar: "Actualizar",
};

const FILTROS: { value: EstadoFila | "todas"; label: string }[] = [
  { value: "todas", label: "Todas" },
  { value: "valida", label: "Válidas" },
  { value: "actualizar", label: "Actualizar" },
  { value: "duplicada", label: "Duplicadas" },
  { value: "error", label: "Con error" },
];

const COLOR: Record<EstadoFila, string> = {
  valida: "text-green-700",
  actualizar: "text-blue-700",
  duplicada: "text-amber-700",
  error: "text-destructive",
};

/** Spec 34: descargar template → subir → validación previa por fila → confirmar → reporte. */
export function CargaMasivaAlumnos({ maxFilas }: { maxFilas: number }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [actualizar, setActualizar] = useState(false);
  const [validacion, setValidacion] = useState<Validacion | null>(null);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [filtro, setFiltro] = useState<EstadoFila | "todas">("todas");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState<"validar" | "importar" | null>(null);

  const enviar = async (modo: "validar" | "importar", file: File, upd: boolean) => {
    const body = new FormData();
    body.set("archivo", file);
    body.set("modo", modo);
    body.set("actualizar", upd ? "1" : "0");
    setCargando(modo);
    setError(null);
    try {
      const res = await fetch("/api/alumnos/carga-masiva", { method: "POST", body });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error ?? "No se pudo procesar el archivo.");
        return null;
      }
      return json;
    } catch {
      setError("No se pudo conectar con el servidor. Intenta de nuevo.");
      return null;
    } finally {
      setCargando(null);
    }
  };

  const validar = async (file: File, upd: boolean) => {
    setResultado(null);
    const json = await enviar("validar", file, upd);
    setValidacion(json);
    setFiltro("todas");
  };

  const alElegir = async (file: File | null) => {
    setArchivo(file);
    setValidacion(null);
    setResultado(null);
    setError(null);
    if (file) await validar(file, actualizar);
  };

  const alCambiarActualizar = async (v: boolean) => {
    setActualizar(v);
    if (archivo) await validar(archivo, v);
  };

  const importar = async () => {
    if (!archivo) return;
    const json = await enviar("importar", archivo, actualizar);
    if (json?.resultado) {
      setResultado(json.resultado);
      setValidacion(null);
      setArchivo(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const importables = validacion ? validacion.resumen.validas + validacion.resumen.actualizar : 0;
  const visibles = validacion?.filas.filter((f) => filtro === "todas" || f.estado === filtro) ?? [];

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardContent className="flex flex-col gap-4 pt-6">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            1. Descarga el template
          </h3>
          <p className="text-sm text-muted-foreground">
            Completa una fila por alumno (máximo {maxFilas} por archivo, 5 MB). El template trae
            los planes vigentes de tu gimnasio, listas desplegables y una hoja de instrucciones.
          </p>
          <div>
            <Button asChild variant="outline" size="lg">
              <a href="/api/export/template-alumnos">
                <Download className="h-4 w-4" />
                Descargar template
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-4 pt-6">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            2. Sube el archivo
          </h3>
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx"
            className="hidden"
            onChange={(e) => alElegir(e.target.files?.[0] ?? null)}
          />
          <div className="flex flex-wrap items-center gap-3">
            <Button
              size="lg"
              variant="outline"
              disabled={cargando !== null}
              onClick={() => inputRef.current?.click()}
            >
              <Upload className="h-4 w-4" />
              {archivo ? "Cambiar archivo" : "Elegir archivo .xlsx"}
            </Button>
            {archivo && <span className="break-all text-sm text-muted-foreground">{archivo.name}</span>}
          </div>
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4"
              checked={actualizar}
              disabled={cargando !== null}
              onChange={(e) => alCambiarActualizar(e.target.checked)}
            />
            <span>
              Actualizar datos de los alumnos que ya existen (por RUT). Solo cambia contacto y
              ficha; no toca plan, fechas ni pagos. Si no, se omiten.
            </span>
          </label>
          {cargando === "validar" && <p className="text-sm text-muted-foreground">Validando…</p>}
          {error && <p className="text-sm text-destructive">{error}</p>}
        </CardContent>
      </Card>

      {validacion && (
        <Card>
          <CardContent className="flex flex-col gap-4 pt-6">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              3. Revisa y confirma
            </h3>
            <p className="text-sm">
              {validacion.resumen.validas} nuevas · {validacion.resumen.actualizar} a actualizar ·{" "}
              {validacion.resumen.duplicadas} duplicadas · {validacion.resumen.errores} con error.
              Solo se importan las filas válidas.
            </p>
            {validacion.bloqueo && <p className="text-sm text-destructive">{validacion.bloqueo}</p>}

            <div className="flex flex-wrap gap-2">
              {FILTROS.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => setFiltro(f.value)}
                  className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold ${
                    filtro === f.value
                      ? "border-primary bg-primary/15 text-secondary-foreground"
                      : "border-border text-muted-foreground"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <ul className="flex flex-col gap-2">
              {visibles.map((f) => (
                <li key={f.fila} className="rounded-[9px] border border-border px-3.5 py-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="break-words font-medium text-foreground">
                        {f.nombre || "(sin nombre)"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Fila {f.fila} · RUT {f.rut || "—"}
                      </div>
                    </div>
                    <Badge variant="outline" className={COLOR[f.estado]}>
                      {ETIQUETA[f.estado]}
                    </Badge>
                  </div>
                  {f.motivos.length > 0 && (
                    <ul className="mt-1.5 list-disc pl-5 text-xs text-muted-foreground">
                      {f.motivos.map((m) => (
                        <li key={m}>{m}</li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
              {visibles.length === 0 && (
                <li className="py-4 text-center text-sm text-muted-foreground">
                  No hay filas con ese estado.
                </li>
              )}
            </ul>

            <div>
              <Button
                size="lg"
                disabled={importables === 0 || !!validacion.bloqueo || cargando !== null}
                onClick={importar}
              >
                {cargando === "importar" ? "Importando…" : `Importar ${importables} alumno${importables === 1 ? "" : "s"}`}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {resultado && (
        <Card>
          <CardContent className="flex flex-col gap-3 pt-6">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Resultado de la carga
            </h3>
            <p className="text-sm">
              {resultado.creados} creados · {resultado.actualizados} actualizados ·{" "}
              {resultado.omitidos} omitidos · {resultado.con_error} con error.
            </p>
            {resultado.omitidos + resultado.con_error > 0 && (
              <div>
                <Button asChild variant="outline" size="lg">
                  <a href={`/api/export/reporte-carga-alumnos?id=${resultado.carga_id}`}>
                    <Download className="h-4 w-4" />
                    Descargar filas con error
                  </a>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
