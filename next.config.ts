import type { NextConfig } from "next";

// Spec 65: CSP en modo enforce (recorridas sitio público, panel, portal y superadmin sin violaciones).
// Al integrar Mercado Pago hay que añadir sus orígenes aquí. Next inyecta scripts inline
// (hidratación), por eso `script-src` lleva 'unsafe-inline' (sin nonce no se puede evitar con
// páginas cacheadas); en desarrollo hace falta además 'unsafe-eval'.
const supabaseOrigen = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin
  : "";
const supabaseWs = supabaseOrigen.replace(/^https:/, "wss:");
const esDev = process.env.NODE_ENV === "development";
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${esDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${supabaseOrigen}`.trim(),
  "font-src 'self'",
  `connect-src 'self' ${supabaseOrigen} ${supabaseWs}`.trim(),
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const nextConfig: NextConfig = {
  cacheComponents: true,
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Content-Security-Policy", value: csp },
        ],
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/login",
        destination: "/auth/login",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
