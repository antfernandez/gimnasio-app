import type { Metadata } from "next";
import { Cinzel, Work_Sans } from "next/font/google";
import "./globals.css";

// `NEXT_PUBLIC_SITE_URL` es el dominio estable de producción; `VERCEL_URL` es la URL
// efímera de cada deployment (cambia en cada deploy) — solo sirve como respaldo en
// preview/local. Ver hallazgo secundario del Sprint 16 (SEO: sitemap/metadata apuntaban
// a la URL efímera).
const defaultUrl = process.env.NEXT_PUBLIC_SITE_URL
  ? process.env.NEXT_PUBLIC_SITE_URL
  : process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000";

const title = "Valinor Estudio — Gestión para tu gimnasio";
const description =
  "Alumnos, pagos, rutinas y avances de tu gimnasio en un solo lugar. Deja el Excel: prueba gratis por 30 días.";

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title,
  description,
  keywords: [
    "software para gimnasios",
    "gestión de gimnasio",
    "sistema para gimnasios pequeños",
    "control de pagos gimnasio",
    "rutinas de entrenamiento",
  ],
  openGraph: {
    title,
    description,
    url: defaultUrl,
    siteName: "Valinor Estudio",
    locale: "es_CL",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
};

const workSans = Work_Sans({
  variable: "--font-work-sans",
  display: "swap",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const cinzel = Cinzel({
  variable: "--font-cinzel",
  display: "swap",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${workSans.variable} ${cinzel.variable}`}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
