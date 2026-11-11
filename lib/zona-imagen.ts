const IMAGENES: Record<string, string> = {
  pectorales: "2_pecho.png",
  espalda: "3_espalda.png",
  hombros: "1_hombros.png",
  biceps: "5_biceps.png",
  triceps: "6_triceps.png",
  piernas: "7_cuadriceps.png",
  gemelos: "8_pantorrillas.png",
  abdominales: "4_abdomen.png",
};

/** Ruta pública de la silueta (hombre) que resalta la zona, o null si no hay. */
export function imagenZona(nombre: string | null | undefined): string | null {
  if (!nombre) return null;
  const clave = nombre.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();
  const archivo = IMAGENES[clave];
  return archivo ? `/Imagenes cuerpo/${archivo}` : null;
}
