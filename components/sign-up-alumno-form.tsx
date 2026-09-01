"use client";

import { ArrowLeft, Check, Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { BrandMark } from "@/components/brand-mark";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";
import { parseRut } from "@/lib/rut";
import { cn } from "@/lib/utils";
import type { GimnasioPublico, PlanPublico } from "@/lib/types";

export function SignUpAlumnoForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [paso, setPaso] = useState<1 | 2>(1);

  const [termino, setTermino] = useState("");
  const [resultados, setResultados] = useState<GimnasioPublico[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [gimnasio, setGimnasio] = useState<GimnasioPublico | null>(null);

  const [rutInput, setRutInput] = useState("");
  const [nombres, setNombres] = useState("");
  const [apellidos, setApellidos] = useState("");
  const [fechaNacimiento, setFechaNacimiento] = useState("");
  const [telefono, setTelefono] = useState("");
  const [planesGimnasio, setPlanesGimnasio] = useState<PlanPublico[]>([]);
  const [planId, setPlanId] = useState("");
  const [email, setEmail] = useState("");
  const [alergias, setAlergias] = useState("");
  const [enfermedades, setEnfermedades] = useState("");
  const [molestias, setMolestias] = useState("");
  const [objetivoEjercicio, setObjetivoEjercicio] = useState("");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (paso !== 1) return;
    const supabase = createClient();
    setBuscando(true);
    const timeout = setTimeout(async () => {
      const { data, error } = await supabase.rpc("buscar_gimnasios", {
        termino,
      });
      if (!error) setResultados((data ?? []) as GimnasioPublico[]);
      setBuscando(false);
    }, 300);
    return () => clearTimeout(timeout);
  }, [termino, paso]);

  const handleContinuar = async () => {
    if (!gimnasio) {
      setError("Elige tu gimnasio para continuar.");
      return;
    }
    setError(null);
    const supabase = createClient();
    const { data, error } = await supabase.rpc("listar_planes_publico", {
      p_gimnasio_id: gimnasio.id,
    });
    if (!error) setPlanesGimnasio((data ?? []) as PlanPublico[]);
    setPaso(2);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!gimnasio) {
      setPaso(1);
      return;
    }

    const parsedRut = parseRut(rutInput);
    if (!parsedRut) {
      setError("El RUT ingresado no es válido. Revisa el dígito verificador.");
      return;
    }
    if (!nombres.trim() || !apellidos.trim()) {
      setError("Nombres y apellidos son obligatorios.");
      return;
    }
    if (password !== repeatPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }

    setIsLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/portal`,
          data: {
            rol: "alumno",
            gimnasio_id: gimnasio.id,
            rut: parsedRut.rut,
            dig_ver: parsedRut.dv,
            nombres: nombres.trim(),
            apellidos: apellidos.trim(),
            fecha_nacimiento: fechaNacimiento || null,
            telefono: telefono.trim() || null,
            plan_id: planId || null,
            alergias: alergias.trim() || null,
            enfermedades: enfermedades.trim() || null,
            molestias: molestias.trim() || null,
            objetivo_ejercicio: objetivoEjercicio.trim() || null,
          },
        },
      });
      if (error) throw error;
      router.push("/auth/sign-up-success");
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "Ocurrió un error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <BrandMark className="mx-auto" />
      <Card>
        <CardContent className="pt-8">
          {paso === 1 ? (
            <>
              <h1 className="mb-1 text-center text-xl">
                ¿En qué gimnasio entrenas?
              </h1>
              <p className="mb-7 text-center text-sm text-muted-foreground">
                Busca tu gimnasio para registrarte como alumno
              </p>

              <div className="grid gap-2">
                <Label htmlFor="busqueda-gimnasio">Nombre del gimnasio</Label>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="busqueda-gimnasio"
                    placeholder="Ej. Fuerza Total"
                    autoFocus
                    className="pl-10"
                    value={termino}
                    onChange={(e) => {
                      setTermino(e.target.value);
                      setGimnasio(null);
                    }}
                  />
                </div>
              </div>

              <div className="mt-4 flex flex-col gap-2">
                {buscando && (
                  <p className="text-center text-sm text-muted-foreground">
                    Buscando…
                  </p>
                )}
                {!buscando && resultados.length === 0 && (
                  <p className="text-center text-sm text-muted-foreground">
                    {termino
                      ? "No encontramos gimnasios con ese nombre."
                      : "Escribe el nombre de tu gimnasio para buscarlo."}
                  </p>
                )}
                {resultados.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => setGimnasio(g)}
                    className={cn(
                      "flex items-center justify-between rounded-[9px] border px-4 py-3 text-left text-sm transition-colors",
                      gimnasio?.id === g.id
                        ? "border-primary bg-primary/10 text-secondary-foreground"
                        : "border-input hover:border-secondary-foreground hover:bg-secondary",
                    )}
                  >
                    <span className="font-medium text-foreground">
                      {g.nombre}
                    </span>
                    {gimnasio?.id === g.id && (
                      <Check className="h-4 w-4 shrink-0 text-primary" />
                    )}
                  </button>
                ))}
              </div>

              {error && (
                <p className="mt-4 text-sm text-destructive">{error}</p>
              )}

              <Button
                type="button"
                size="lg"
                className="mt-6 w-full"
                onClick={handleContinuar}
                disabled={!gimnasio}
              >
                Continuar
              </Button>

              <p className="mt-6 text-center text-sm text-muted-foreground">
                <Link
                  href="/auth/login"
                  className="inline-flex items-center gap-1 text-secondary-foreground underline underline-offset-4"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Volver
                </Link>
              </p>
            </>
          ) : (
            <>
              <h1 className="mb-1 text-center text-xl">Crea tu cuenta</h1>
              <p className="mb-7 text-center text-sm text-muted-foreground">
                Te registras en{" "}
                <span className="font-medium text-foreground">
                  {gimnasio?.nombre}
                </span>
              </p>
              <form onSubmit={handleSignUp}>
                <div className="flex flex-col gap-5">
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div className="grid gap-2">
                      <Label htmlFor="rut">RUT</Label>
                      <Input
                        id="rut"
                        placeholder="12.345.678-9"
                        required
                        autoFocus
                        value={rutInput}
                        onChange={(e) => setRutInput(e.target.value)}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="plan-id">Plan (opcional)</Label>
                      <Select
                        id="plan-id"
                        value={planId}
                        onChange={(e) => setPlanId(e.target.value)}
                        disabled={planesGimnasio.length === 0}
                      >
                        <option value="">
                          {planesGimnasio.length === 0
                            ? "Tu estudio aún no configuró planes"
                            : "— Elige un plan —"}
                        </option>
                        {planesGimnasio.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.nombre} ({p.dias_por_semana} días/semana)
                          </option>
                        ))}
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="nombres">Nombres</Label>
                      <Input
                        id="nombres"
                        required
                        value={nombres}
                        onChange={(e) => setNombres(e.target.value)}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="apellidos">Apellidos</Label>
                      <Input
                        id="apellidos"
                        required
                        value={apellidos}
                        onChange={(e) => setApellidos(e.target.value)}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="fecha-nacimiento">
                        Fecha de nacimiento (opcional)
                      </Label>
                      <Input
                        id="fecha-nacimiento"
                        type="date"
                        value={fechaNacimiento}
                        onChange={(e) => setFechaNacimiento(e.target.value)}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="telefono">Teléfono (opcional)</Label>
                      <Input
                        id="telefono"
                        type="tel"
                        placeholder="+56 9 0000 0000"
                        value={telefono}
                        onChange={(e) => setTelefono(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid gap-5 border-t border-border pt-5 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                        Ficha de salud (opcional)
                      </h3>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Ayuda a tu estudio a entrenarte de forma segura. Puedes
                        completarla después.
                      </p>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="alergias">Alergias</Label>
                      <Textarea
                        id="alergias"
                        placeholder="Ej. Ninguna conocida"
                        value={alergias}
                        onChange={(e) => setAlergias(e.target.value)}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="enfermedades">Enfermedades</Label>
                      <Textarea
                        id="enfermedades"
                        placeholder="Ej. Hipertensión controlada"
                        value={enfermedades}
                        onChange={(e) => setEnfermedades(e.target.value)}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="molestias">Molestias o lesiones</Label>
                      <Textarea
                        id="molestias"
                        placeholder="Ej. Esguince de tobillo derecho (2025)"
                        value={molestias}
                        onChange={(e) => setMolestias(e.target.value)}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="objetivo-ejercicio">
                        Objetivo con el ejercicio
                      </Label>
                      <Textarea
                        id="objetivo-ejercicio"
                        placeholder="Ej. Bajar de peso, ganar masa muscular"
                        value={objetivoEjercicio}
                        onChange={(e) => setObjetivoEjercicio(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="email">Correo electrónico</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="tu@correo.cl"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="password">Contraseña</Label>
                    <Input
                      id="password"
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="repeat-password">Repite la contraseña</Label>
                    <Input
                      id="repeat-password"
                      type="password"
                      required
                      value={repeatPassword}
                      onChange={(e) => setRepeatPassword(e.target.value)}
                    />
                  </div>
                  {error && (
                    <p className="text-sm text-destructive">{error}</p>
                  )}
                  <Button
                    type="submit"
                    size="lg"
                    className="w-full"
                    disabled={isLoading}
                  >
                    {isLoading ? "Creando cuenta…" : "Crear mi cuenta"}
                  </Button>
                  <button
                    type="button"
                    onClick={() => setPaso(1)}
                    className="inline-flex items-center justify-center gap-1 text-sm text-muted-foreground hover:text-primary"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Cambiar gimnasio
                  </button>
                </div>
              </form>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
