import {
  Activity, Apple, Bike, Dumbbell, Flame, Footprints, HeartPulse, Leaf, Medal, Mountain,
  Music, PersonStanding, Salad, Sparkles, Target, Timer, Trophy, Users, Waves, Zap,
  type LucideIcon,
} from "lucide-react";

import { type IconoServicio } from "@/lib/sitio";

/** Spec 71 §12.3: id guardado en el contenido → icono. */
export const ICONOS: Record<IconoServicio, { Icono: LucideIcon; nombre: string }> = {
  mancuerna: { Icono: Dumbbell, nombre: "Mancuerna" },
  fuego: { Icono: Flame, nombre: "Fuego" },
  corazon: { Icono: HeartPulse, nombre: "Corazón" },
  trofeo: { Icono: Trophy, nombre: "Trofeo" },
  destello: { Icono: Sparkles, nombre: "Destello" },
  usuarios: { Icono: Users, nombre: "Grupo" },
  bicicleta: { Icono: Bike, nombre: "Bicicleta" },
  huellas: { Icono: Footprints, nombre: "Correr" },
  actividad: { Icono: Activity, nombre: "Actividad" },
  cronometro: { Icono: Timer, nombre: "Cronómetro" },
  objetivo: { Icono: Target, nombre: "Objetivo" },
  rayo: { Icono: Zap, nombre: "Energía" },
  manzana: { Icono: Apple, nombre: "Nutrición" },
  ensalada: { Icono: Salad, nombre: "Ensalada" },
  medalla: { Icono: Medal, nombre: "Medalla" },
  olas: { Icono: Waves, nombre: "Agua" },
  montana: { Icono: Mountain, nombre: "Montaña" },
  musica: { Icono: Music, nombre: "Música" },
  persona: { Icono: PersonStanding, nombre: "Persona" },
  hoja: { Icono: Leaf, nombre: "Hoja" },
};
