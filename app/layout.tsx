import type { Metadata } from "next";
import { Cinzel, Work_Sans } from "next/font/google";
import "./globals.css";

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title: "Gimnasio App — Gestión para tu gimnasio",
  description:
    "Alumnos, pagos, rutinas y avances de tu gimnasio en un solo lugar.",
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
  weight: ["500", "600", "700"],
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
