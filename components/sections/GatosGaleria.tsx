"use client";

import { useEffect, useRef, useState } from "react";
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

/** Px de arrastre horizontal a partir de los cuales un gesto cuenta como
 * swipe (avanza/retrocede de gato) en vez de snap-back. */
const SWIPE_THRESHOLD = 90;
/** Px de arrastre por debajo de los cuales un pointerUp cuenta como tap
 * (abre el lightbox) en vez de un intento fallido de swipe. */
const TAP_THRESHOLD = 6;
/** Debe coincidir con la duración de transición usada en los estilos de
 * abajo -- se usa también para el timeout que aplica el cambio de índice
 * después de que la tarjeta termina de animarse fuera de pantalla. */
const EXIT_DURATION = 220;

/**
 * Galería de gatos disponibles en formato swipe: se muestra un gato a la
 * vez, en tarjetas apiladas al estilo "dating app" -- se desliza (o se
 * usan las flechas) para pasar al siguiente/anterior, y un tap sin
 * arrastre abre el lightbox con la foto ampliada y el botón "Quiero
 * adoptar" -- mismo comportamiento de siempre, solo cambia cómo se
 * navega entre gatos.
 */
export function GatosGaleria({
  campaign,
  gatosDisponibles,
}: {
  campaign: CampaignParams;
  gatosDisponibles: Gato[];
}) {
  const [seleccionado, setSeleccionado] = useState<Gato | null>(null);
  const [index, setIndex] = useState(0);
  const [dragX, setDragX] = useState(0);
  const [arrastrando, setArrastrando] = useState(false);
  const [exitDir, setExitDir] = useState<"left" | "right" | null>(null);
  const startXRef = useRef(0);

  const total = gatosDisponibles.length;
  const safeIndex = total > 0 ? ((index % total) + total) % total : 0;

  function avanzar(direccion: "left" | "right") {
    if (total <= 1) return;
    setExitDir(direccion);
    window.setTimeout(() => {
      setIndex((i) => (direccion === "left" ? (i + 1) % total : (i - 1 + total) % total));
      setExitDir(null);
      setDragX(0);
    }, EXIT_DURATION);
  }

  // Flechas del teclado -- misma navegación que el swipe, para quien usa
  // escritorio sin mouse de arrastre cómodo.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") avanzar("right");
      if (e.key === "ArrowRight") avanzar("left");
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [total]);

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (exitDir) return;
    startXRef.current = e.clientX;
    setArrastrando(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!arrastrando) return;
    setDragX(e.clientX - startXRef.current);
  }

  function onPointerUp(gatoActual: Gato) {
    return () => {
      if (!arrastrando) return;
      setArrastrando(false);
      if (total > 1 && Math.abs(dragX) > SWIPE_THRESHOLD) {
        avanzar(dragX < 0 ? "left" : "right");
      } else if (Math.abs(dragX) < TAP_THRESHOLD) {
        setSeleccionado(gatoActual);
        setDragX(0);
      } else {
        setDragX(0);
      }
    };
  }

  if (total === 0) return null;

  // Hasta 3 tarjetas apiladas visibles: la actual (arriba, interactiva) +
  // hasta 2 de "peek" detrás, solo decorativas.
  const visibles = [0, 1, 2]
    .filter((offset) => offset < total)
    .map((offset) => ({ offset, gato: gatosDisponibles[(safeIndex + offset) % total] }));

  return (
    <div className="bg-[var(--rescue-paper)] scroll-mt-14">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 py-10 sm:py-12">
        <RibbonBanner tone="dark" className="mb-4">
          Conoce a quién puedes adoptar hoy
        </RibbonBanner>

        <div className="mx-auto max-w-sm">
          <div className="relative h-[440px] select-none">
            {visibles
              .slice()
              .reverse()
              .map(({ offset, gato }) => {
                const esActual = offset === 0;
                const rotacion = esActual ? dragX / 18 : 0;
                const translateX = esActual
                  ? exitDir === "left"
                    ? -420
                    : exitDir === "right"
                      ? 420
                      : dragX
                  : 0;
                const escala = esActual ? 1 : 1 - offset * 0.04;
                const translateY = esActual ? 0 : offset * 10;
                const sinTransicion = esActual && arrastrando;

                return (
                  <div
                    key={gato.id}
                    style={{
                      zIndex: 10 - offset,
                      transform: `translate(${translateX}px, ${translateY}px) rotate(${rotacion}deg) scale(${escala})`,
                      transition: sinTransicion ? "none" : `transform ${EXIT_DURATION}ms ease-out`,
                      opacity: esActual ? 1 : 0.85 - offset * 0.15,
                      touchAction: esActual ? "pan-y" : undefined,
                    }}
                    className="absolute inset-0 rounded-2xl overflow-hidden border-2 border-[var(--rescue-ink)]/10 bg-white flex flex-col shadow-lg cursor-grab active:cursor-grabbing"
                    onPointerDown={esActual ? onPointerDown : undefined}
                    onPointerMove={esActual ? onPointerMove : undefined}
                    onPointerUp={esActual ? onPointerUp(gato) : undefined}
                    onPointerCancel={esActual ? onPointerUp(gato) : undefined}
                  >
                    <div className="flex-1 overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={gato.fotoUrl!}
                        alt={gato.nombre}
                        draggable={false}
                        className="w-full h-full object-cover pointer-events-none"
                      />
                    </div>
                    <div className="p-3">
                      <p className="font-bold text-base text-[var(--rescue-ink)] truncate">{gato.nombre}</p>
                      <p className="text-sm text-[var(--rescue-ink)]/60 truncate">
                        {[gato.sexo, gato.edadAprox].filter(Boolean).join(" · ") || "Disponible"}
                      </p>
                    </div>
                  </div>
                );
              })}
          </div>

          {/* Flechas + contador -- también permiten navegar en escritorio,
           * donde no hay gesto táctil de swipe. */}
          <div className="mt-4 flex items-center justify-between gap-3">
            <button
              type="button"
              aria-label="Gato anterior"
              onClick={() => avanzar("right")}
              disabled={total <= 1}
              className="w-9 h-9 rounded-full bg-white border-2 border-[var(--rescue-ink)]/15 flex items-center justify-center text-[var(--rescue-ink)] text-lg disabled:opacity-30"
            >
              ‹
            </button>
            <div className="text-center">
              <p className="text-xs font-semibold text-[var(--rescue-ink)]/70">
                Gato {safeIndex + 1} de {total}
              </p>
              {total > 1 && (
                <p className="text-[11px] text-[var(--rescue-ink)]/45">← Desliza para ver más →</p>
              )}
            </div>
            <button
              type="button"
              aria-label="Siguiente gato"
              onClick={() => avanzar("left")}
              disabled={total <= 1}
              className="w-9 h-9 rounded-full bg-white border-2 border-[var(--rescue-ink)]/15 flex items-center justify-center text-[var(--rescue-ink)] text-lg disabled:opacity-30"
            >
              ›
            </button>
          </div>
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
