import { listProductosActivos, listGatosDisponibles } from "@/lib/db";
import { PublicNav } from "@/components/rescue/PublicNav";
import { AdoptaSection } from "@/components/sections/AdoptaSection";
import { DonaSection } from "@/components/sections/DonaSection";
import { TiendaSection } from "@/components/sections/TiendaSection";
import { WhatsAppBar } from "@/components/rescue/WhatsAppBar";
import { ClosingRibbon } from "@/components/rescue/RibbonBanner";
import { CONTACTO_WHATSAPP } from "@/lib/contacto";

export const dynamic = "force-dynamic";

/**
 * Landing pública fusionada: Adopta + Dona + Tienda en una sola URL
 * (secciones ancladas con #adopta, #dona, #tienda), pensada para recibir
 * tráfico pagado de Instagram, TikTok o Amazon Ads directo a la sección de
 * adopción. Los accesos con contraseña (refugio / administración) están en
 * el encabezado (PublicNav) y llevan a /refugio y /reportes -- rutas
 * aparte, cada una con su propio login, sin lógica nueva agregada aquí.
 *
 * Las rutas viejas /adopta y /tienda siguen existiendo como redirección
 * hacia las secciones de aquí (conservando los parámetros de la URL), para
 * que un link o anuncio que ya apunte ahí no se rompa.
 */
export default async function Home({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

  // Compatibilidad con el link viejo `?src=instagram` que ya pudiera estar
  // circulando en algún anuncio -- se sigue aceptando además de los utm_*
  // estándar. Configura Meta Ads Manager / TikTok Ads Manager / Amazon Ads
  // para agregar utm_source, utm_medium, utm_campaign y utm_content a la
  // URL de destino del anuncio (las tres plataformas lo permiten desde su
  // configuración de tracking) y aquí quedan capturados automáticamente.
  const legacySrc = one(sp.src);
  const utmSource = one(sp.utm_source) || (legacySrc === "instagram" ? "instagram" : "");
  const utmMedium = one(sp.utm_medium);
  const utmCampaign = one(sp.utm_campaign);
  const utmContent = one(sp.utm_content);
  const source = utmSource.toLowerCase().includes("instagram") ? "ANUNCIO_INSTAGRAM" : "";
  const gatoInteres = one(sp.gatoInteres);
  const donativoError = one(sp.donativoError);

  const productos = await listProductosActivos();
  // Solo se muestran los gatos disponibles que ya tienen foto -- una
  // tarjeta sin foto en una galería pensada para convertir tráfico de
  // ads se ve a medio construir, así que mejor no mostrarla (el gato
  // sigue apareciendo en el panel del refugio de todas formas).
  const gatosDisponibles = (await listGatosDisponibles()).filter((g) => g.fotoUrl);

  return (
    <>
      <PublicNav />
      <main className="flex flex-col">
        <AdoptaSection
          campaign={{ source, utmSource, utmMedium, utmCampaign, utmContent, gatoInteres }}
          gatosDisponibles={gatosDisponibles}
        />
        <DonaSection montoError={donativoError === "monto"} />
        <TiendaSection productos={productos} />

        <section className="rescue-theme bg-[var(--rescue-paper)] px-4 sm:px-6 py-8 flex flex-col items-center gap-6">
          <div className="w-full max-w-md">
            <WhatsAppBar phone={CONTACTO_WHATSAPP} message="Hola, quiero información para adoptar" />
          </div>
          <ClosingRibbon className="w-full max-w-xl" />
        </section>
      </main>
    </>
  );
}
