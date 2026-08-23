import type { Metadata } from "next";
import { Bebas_Neue, Inter } from "next/font/google";
import "./globals.css";

const defaultUrl = process.env.VERCEL_URL
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

const inter = Inter({
  variable: "--font-inter",
  display: "swap",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const bebasNeue = Bebas_Neue({
  variable: "--font-bebas-neue",
  display: "swap",
  subsets: ["latin"],
  weight: ["400"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${inter.variable} ${bebasNeue.variable}`}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
