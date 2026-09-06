"use client";

import { useState } from "react";
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
 * Galería de gatos disponibles. Al hacer click en una tarjeta se abre un
 * lightbox con la foto ampliada (en vez de saltar directo al formulario),
 * y desde ahí hay un botón explícito para pasar a "Quiero adoptar" -- así
 * la persona puede ver bien al gato antes de decidir seguir.
 */
export function GatosGaleria({
  campaign,
  gatosDisponibles,
}: {
  campaign: CampaignParams;
  gatosDisponibles: Gato[];
}) {
  const [seleccionado, setSeleccionado] = useState<Gato | null>(null);

  return (
    <div className="bg-[var(--rescue-paper)] scroll-mt-14">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 py-10 sm:py-12">
        <RibbonBanner tone="dark" className="mb-4">
          Conoce a quién puedes adoptar hoy
        </RibbonBanner>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {gatosDisponibles.map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => setSeleccionado(g)}
              className="group rounded-xl overflow-hidden border-2 border-[var(--rescue-ink)]/10 bg-white flex flex-col text-left cursor-zoom-in"
            >
              <div className="aspect-square overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={g.fotoUrl!}
                  alt={g.nombre}
                  className="w-full h-full object-cover group-hover:scale-105 transition"
                />
              </div>
              <div className="p-2.5">
                <p className="font-bold text-sm text-[var(--rescue-ink)] truncate">{g.nombre}</p>
                <p className="text-xs text-[var(--rescue-ink)]/60 truncate">
                  {[g.sexo, g.edadAprox].filter(Boolean).join(" · ") || "Disponible"}
                </p>
              </div>
            </button>
          ))}
        </div>
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
              src={seleccionado.fotoUrl!}
              alt={seleccionado.nombre}
              className="w-full max-h-[70vh] object-contain bg-[var(--rescue-paper)]"
            />
            <div className="p-4 flex flex-col gap-3">
              <div>
                <p className="font-bold text-lg text-[var(--rescue-ink)]">{seleccionado.nombre}</p>
                <p className="text-sm text-[var(--rescue-ink)]/60">
                  {[seleccionado.sexo, seleccionado.edadAprox].filter(Boolean).join(" · ") || "Disponible"}
                </p>
                {seleccionado.descripcion && (
                  <p className="mt-1 text-sm text-[var(--rescue-ink)]/75">{seleccionado.descripcion}</p>
                )}
              </div>
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
