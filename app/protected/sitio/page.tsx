import { EditorSitio } from "@/components/sitio/editor-sitio";
import { getPerfilActual } from "@/lib/perfil";
import { getSitioActual } from "@/lib/sitio-actual";

export default async function SitioPage() {
  const [perfilData, sitioData] = await Promise.all([
    getPerfilActual(),
    getSitioActual(),
  ]);
  if (!perfilData || !sitioData) return null; // el layout ya redirige a /auth/login

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="mb-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Panel del dueño
        </div>
        <h2 className="text-2xl">Sitio público</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Edita el contenido y la apariencia del sitio web de tu gimnasio. Los cambios
          se guardan solos; nada se ve en tu sitio público hasta que presionas
          &ldquo;Publicar cambios&rdquo;.
        </p>
      </div>

      <EditorSitio
        gimnasioId={perfilData.perfil.gimnasio_id}
        slug={perfilData.gimnasio.slug}
        contenidoInicial={sitioData.sitio.contenido_borrador}
        temaInicial={sitioData.sitio.tema}
        colorAcentoInicial={sitioData.sitio.color_acento}
        publicadoAtInicial={sitioData.sitio.publicado_at}
      />
    </div>
  );
}
