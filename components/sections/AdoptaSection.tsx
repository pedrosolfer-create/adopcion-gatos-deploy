import { submitAdoptaFormAction } from "@/app/adopta/actions";
import { RibbonBanner } from "@/components/rescue/RibbonBanner";
import { InfoBadge } from "@/components/rescue/InfoBadge";
import { HeartDoodle, SparkleDoodle } from "@/components/rescue/Doodles";
import { GatosGaleria } from "@/components/sections/GatosGaleria";
import type { Gato } from "@/lib/db";

export type CampaignParams = {
  source: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  utmContent: string;
  /** Nombre del gato en el que dio clic la persona en la galería de
   * disponibles (viene de ?gatoInteres=Nombre en la URL). Se usa solo
   * para precargar el campo de comentario del formulario -- la persona
   * lo puede editar o borrar libremente. */
  gatoInteres: string;
};

/**
 * Sección "Adopta" -- primera sección de la landing pública fusionada
 * (id="adopta"), pensada para ser el destino directo de un anuncio de
 * Instagram/TikTok/Amazon Ads: hero + CTA arriba de todo, sin que la
 * persona tenga que pasar antes por donativos o tienda.
 */
export function AdoptaSection({
  campaign,
  gatosDisponibles,
}: {
  campaign: CampaignParams;
  /** Gatos con estado DISPONIBLE y foto ya subida -- un gato sin foto no
   * se muestra aquí (ver GatosGaleria más abajo) porque una tarjeta sin
   * foto convierte peor y da la impresión de un sitio a medio construir. */
  gatosDisponibles: Gato[];
}) {
  return (
    <section id="adopta" className="rescue-theme flex flex-col scroll-mt-14">
      {/* ---------- Hero ---------- */}
      <div className="relative overflow-hidden">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 py-14 sm:py-20 grid md:grid-cols-2 gap-10 items-center">
          <div className="relative">
            <HeartDoodle
              className="absolute -top-8 -left-2 w-10 h-10 -rotate-12 opacity-80 hidden sm:block"
              color="var(--rescue-accent)"
            />
            <div className="flex items-center gap-2 mb-5">
              <RibbonBanner tone="dark">¡Adopta!</RibbonBanner>
              <SparkleDoodle className="w-6 h-6" color="var(--rescue-accent)" />
            </div>
            <h1 className="rescue-script text-6xl sm:text-7xl leading-[0.95] text-[var(--rescue-ink)]">
              El amor no se compra, se adopta
            </h1>
            <div className="mt-4">
              <InfoBadge icon={<HeartDoodle className="w-4 h-4" color="var(--rescue-accent)" />}>
                Adopción responsable
              </InfoBadge>
            </div>
            <p className="mt-5 text-base sm:text-lg text-[var(--rescue-ink)]/75 max-w-md">
              Conoce a los gatitos que están esperando un hogar como el tuyo. Llena el
              formulario y te contactamos en cuanto veamos tu solicitud.
            </p>
            <a
              href="#formulario"
              className="rescue-ribbon rescue-display mt-7 inline-flex items-center gap-2 bg-[var(--rescue-ink)] text-white px-7 py-3 font-extrabold uppercase text-sm hover:opacity-90 transition"
            >
              Quiero adoptar →
            </a>
          </div>
          <div className="relative rounded-2xl overflow-hidden shadow-2xl border-4 border-[var(--rescue-ink)]">
            {/* Video en loop silencioso -- muted es obligatorio para que los
             * navegadores permitan el autoplay sin interacción del usuario.
             * poster usa la imagen antes/después previa como respaldo
             * mientras el video carga o si el navegador no puede reproducirlo. */}
            <video
              autoPlay
              muted
              loop
              playsInline
              poster="/adopta-hero.png"
              aria-label="Antes y después de una adopción -- dona para mantener esta página"
              className="w-full h-full object-cover aspect-square"
            >
              <source src="/adopta-hero.mp4" type="video/mp4" />
            </video>
          </div>
        </div>
      </div>

      {/* ---------- Galería de disponibles ---------- */}
      {gatosDisponibles.length > 0 && (
        <GatosGaleria campaign={campaign} gatosDisponibles={gatosDisponibles} />
      )}

      {/* ---------- Formulario filtro ---------- */}
      <div id="formulario" className="bg-[var(--rescue-paper-alt)] scroll-mt-14">
        <div className="mx-auto max-w-2xl px-4 sm:px-6 py-14 sm:py-20">
          <RibbonBanner tone="accent" className="mb-4">
            Cuéntanos de ti
          </RibbonBanner>
          <p className="mt-2 text-sm text-[var(--rescue-ink)]/70">
            Estas preguntas nos ayudan a saber si tenemos un gato que encaje bien con tu
            situación -- no es un examen, es para cuidar tanto de ti como del gato.
          </p>

          <form
            action={submitAdoptaFormAction}
            className="mt-8 flex flex-col gap-5 bg-white rounded-2xl border-2 border-[var(--rescue-ink)]/10 p-5 sm:p-7"
          >
            <input type="hidden" name="source" value={campaign.source} />
            <input type="hidden" name="utmSource" value={campaign.utmSource} />
            <input type="hidden" name="utmMedium" value={campaign.utmMedium} />
            <input type="hidden" name="utmCampaign" value={campaign.utmCampaign} />
            <input type="hidden" name="utmContent" value={campaign.utmContent} />

            <div className="grid sm:grid-cols-2 gap-4">
              <label className="flex flex-col gap-1">
                <span className="text-sm font-semibold text-[var(--rescue-ink)]">Nombre completo *</span>
                <input name="nombre" required className="input" />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-sm font-semibold text-[var(--rescue-ink)]">Teléfono *</span>
                <input name="telefono" required type="tel" className="input" />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-sm font-semibold text-[var(--rescue-ink)]">Correo</span>
                <input name="email" type="email" className="input" />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-sm font-semibold text-[var(--rescue-ink)]">Ciudad *</span>
                <input name="ciudad" required className="input" />
              </label>
            </div>

            <fieldset className="flex flex-col gap-2">
              <legend className="text-sm font-semibold text-[var(--rescue-ink)] mb-1">Tu vivienda es...</legend>
              <div className="flex gap-4 text-sm text-[var(--rescue-ink)]/70">
                <label className="flex items-center gap-1.5">
                  <input type="radio" name="tipoVivienda" value="casa" defaultChecked /> Casa
                </label>
                <label className="flex items-center gap-1.5">
                  <input type="radio" name="tipoVivienda" value="departamento" /> Departamento
                </label>
              </div>
            </fieldset>

            <YesNoField name="viviendaEnRenta" label="¿Tu vivienda es rentada?" />
            <YesNoField
              name="permiteMascotasRenta"
              label="Si es rentada, ¿el contrato permite mascotas?"
            />
            <YesNoField name="tieneOtrasMascotas" label="¿Tienes otras mascotas actualmente?" />
            <label className="flex flex-col gap-1">
              <span className="text-sm text-[var(--rescue-ink)]/70">Si sí, cuéntanos cuáles (opcional)</span>
              <input name="otrasMascotasDetalle" className="input" placeholder="Ej. un perro adulto tranquilo" />
            </label>
            <YesNoField name="experienciaPrevia" label="¿Tienes experiencia previa cuidando gatos?" />
            <YesNoField
              name="todaLaFamiliaDeAcuerdo"
              label="¿Todas las personas en tu casa están de acuerdo con la adopción?"
            />

            <label className="flex flex-col gap-1">
              <span className="text-sm font-semibold text-[var(--rescue-ink)]">¿Por qué quieres adoptar? (opcional)</span>
              <textarea
                name="comentario"
                rows={3}
                className="input"
                defaultValue={campaign.gatoInteres ? `Me interesa adoptar a ${campaign.gatoInteres}. ` : undefined}
              />
            </label>

            <button
              type="submit"
              className="rescue-ribbon rescue-display self-start bg-[var(--rescue-ink)] text-white px-7 py-3 font-extrabold uppercase text-sm hover:opacity-90 transition"
            >
              Enviar solicitud
            </button>
            <p className="text-xs text-[var(--rescue-ink)]/50">
              * Campos obligatorios. Tus datos solo se usan para dar seguimiento a tu solicitud
              de adopción.
            </p>
          </form>
        </div>
      </div>
    </section>
  );
}

function YesNoField({ name, label }: { name: string; label: string }) {
  return (
    <fieldset className="flex items-center justify-between gap-3">
      <legend className="sr-only">{label}</legend>
      <span className="text-sm text-[var(--rescue-ink)]/70">{label}</span>
      <div className="flex gap-3 text-sm shrink-0">
        <label className="flex items-center gap-1.5">
          <input type="radio" name={name} value="true" /> Sí
        </label>
        <label className="flex items-center gap-1.5">
          <input type="radio" name={name} value="false" /> No
        </label>
      </div>
    </fieldset>
  );
}
