"use client";

import { useRef, useState } from "react";
import { RibbonBanner } from "@/components/rescue/RibbonBanner";
import type { Gato } from "@/lib/db";
import type { CampaignParams } from "@/components/sections/AdoptaSection";

/** Reconstruye el query string preservando los utm_* actuales (para que un
 * clic en la galería de gatos no tire la atribución de la campaña que trajo
 * a la persona) y agrega gatoInteres con el gato en el que dio clic. No se
 * reincluye `source` -- Home ya lo vuelve a derivar de utm_source en cada
 * carga (ver app/page.tsx). */
function gatoHref(campaign: CampaignParams, gatoNombre: string): string {
  const qs = new URLSearchParams();
  if (campaign.utmSource) qs.set("utm_source", campaign.utmSource);
  if (campaign.utmMedium) qs.set("utm_medium", campaign.utmMedium);
  if (campaign.utmCampaign) qs.set("utm_campaign", campaign.utmCampaign);
  if (campaign.utmContent) qs.set("utm_content", campaign.utmContent);
  qs.set("gatoInteres", gatoNombre);
  return qs.toString();
}

/**
 * Galería de gatos disponibles en formato carrusel: se ven varias tarjetas
 * a la vez (hasta 4 en pantallas grandes), cada una con el flyer
 * auto-generado del gato -- sus 3 fotos + nombre/edad/personalidad/salud ya
 * combinados en una sola imagen por /gato/[id]/flyer (ver ese route.tsx).
 * Se desliza de una tarjeta a la vez hacia los lados, con gesto táctil
 * nativo (scroll-snap) o con las flechas. Un tap sobre una tarjeta abre el
 * lightbox con el flyer ampliado y el botón "Quiero adoptar".
 */
export function GatosGaleria({
  campaign,
  gatosDisponibles,
}: {
  campaign: CampaignParams;
  gatosDisponibles: Gato[];
}) {
  const [seleccionado, setSeleccionado] = useState<Gato | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);

  const total = gatosDisponibles.length;
  if (total === 0) return null;

  /** Desplaza el carrusel exactamente el ancho de una tarjeta (+ separación)
   * -- así las flechas avanzan de una en una, igual que el gesto de swipe. */
  function desplazar(direccion: "izquierda" | "derecha") {
    const track = trackRef.current;
    if (!track) return;
    const tarjeta = track.querySelector<HTMLElement>("[data-tarjeta]");
    const paso = tarjeta ? tarjeta.getBoundingClientRect().width + 16 : track.clientWidth * 0.8;
    track.scrollBy({ left: direccion === "derecha" ? paso : -paso, behavior: "smooth" });
  }

  return (
    <div className="bg-[var(--rescue-paper)] scroll-mt-14">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10 sm:py-12">
        <div className="flex items-center justify-between gap-3 mb-4">
          <RibbonBanner tone="dark">Conoce a quién puedes adoptar hoy</RibbonBanner>
          {total > 1 && (
            <div className="hidden sm:flex items-center gap-2 shrink-0">
              <button
                type="button"
                aria-label="Ver gatos anteriores"
                onClick={() => desplazar("izquierda")}
                className="w-9 h-9 rounded-full bg-white border-2 border-[var(--rescue-ink)]/15 flex items-center justify-center text-[var(--rescue-ink)] text-lg hover:bg-[var(--rescue-paper-alt)] transition"
              >
                ‹
              </button>
              <button
                type="button"
                aria-label="Ver más gatos"
                onClick={() => desplazar("derecha")}
                className="w-9 h-9 rounded-full bg-white border-2 border-[var(--rescue-ink)]/15 flex items-center justify-center text-[var(--rescue-ink)] text-lg hover:bg-[var(--rescue-paper-alt)] transition"
              >
                ›
              </button>
            </div>
          )}
        </div>

        {/* Carrusel: scroll-snap nativo -- en móvil se desliza con el dedo,
         * en escritorio con las flechas de arriba o arrastrando con mouse.
         * El ancho de cada tarjeta define cuántas se alcanzan a ver: ~1.3
         * en móvil (con "peek" de la siguiente), ~2.3 en tablet, 4 en
         * escritorio (max-w-6xl / 4 con separación). */}
        <div
          ref={trackRef}
          className="flex gap-4 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {gatosDisponibles.map((gato) => (
            <button
              key={gato.id}
              type="button"
              data-tarjeta
              onClick={() => setSeleccionado(gato)}
              className="shrink-0 snap-start w-[72%] sm:w-[38%] lg:w-[23%] rounded-2xl overflow-hidden border-2 border-[var(--rescue-ink)]/10 bg-white shadow-lg text-left"
            >
              <div className="aspect-[4/5] bg-[var(--rescue-paper-alt)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/gato/${gato.id}/flyer`}
                  alt={`Flyer de ${gato.nombre}`}
                  loading="lazy"
                  className="w-full h-full object-cover pointer-events-none"
                />
              </div>
            </button>
          ))}
        </div>

        {total > 1 && (
          <p className="mt-3 text-center text-[11px] text-[var(--rescue-ink)]/45 sm:hidden">
            ← Desliza para ver más →
          </p>
        )}
      </div>

      {seleccionado && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-8"
          role="dialog"
          aria-modal="true"
          aria-label={`Foto de ${seleccionado.nombre}`}
          onClick={() => setSeleccionado(null)}
        >
          <div
            className="relative w-full max-w-md bg-white rounded-2xl overflow-hidden shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setSeleccionado(null)}
              aria-label="Cerrar"
              className="absolute top-2 right-2 z-10 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center text-lg leading-none hover:bg-black/80"
            >
              ×
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/gato/${seleccionado.id}/flyer`}
              alt={`Flyer de ${seleccionado.nombre}`}
              className="w-full max-h-[75vh] object-contain bg-[var(--rescue-paper)]"
            />
            <div className="p-4 flex flex-col gap-3">
              <a
                href={`?${gatoHref(campaign, seleccionado.nombre)}#formulario`}
                className="rescue-ribbon rescue-display self-start bg-[var(--rescue-ink)] text-white px-6 py-2.5 font-extrabold uppercase text-sm hover:opacity-90 transition"
              >
                Quiero adoptar a {seleccionado.nombre} →
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
