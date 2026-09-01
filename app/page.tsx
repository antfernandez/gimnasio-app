import { redirect } from "next/navigation";

// Sprint 12, Parte A: el dominio raíz dejó de ser una landing "SaaS multi-gimnasio"
// genérica (planes/precios/testimonios de ejemplo, CTA "Crea tu gimnasio") — el
// sistema queda 100% enfocado en Valinor Estudio de cara al usuario. Valinor ya
// tiene un sitio público real y con contenido real en `/g/valinor` (CMS del
// Sprint 7, contenido cargado en el Sprint 11), así que en vez de mantener dos
// páginas de marketing duplicadas, la raíz redirige directo ahí. El modelo de
// datos multi-tenant sigue intacto por debajo (`/g/[slug]` sirve cualquier
// gimnasio) — esto es solo el punto de entrada público.
export default function Home() {
  redirect("/g/valinor");
}
