import type { ReactNode } from "react";

/**
 * Listón tipo "cinta rota" (bordes en zigzag), como el "¡ADOPTA!" y
 * "BUSCA SU FAMILIA" de los flyers de referencia. `tone="dark"` = fondo
 * negro con texto blanco; `tone="accent"` = fondo del color de acento
 * (amarillo o verde según `.rescue-theme--green`) con texto oscuro.
 */
export function RibbonBanner({
  children,
  tone = "dark",
  className = "",
}: {
  children: ReactNode;
  tone?: "dark" | "accent";
  className?: string;
}) {
  const toneClass =
    tone === "dark" ? "bg-[var(--rescue-ink)] text-white" : "bg-[var(--rescue-accent)] text-[var(--rescue-ink)]";
  return (
    <div
      className={`rescue-ribbon rescue-display inline-block px-5 py-2.5 font-extrabold uppercase tracking-wide text-sm sm:text-base leading-none ${toneClass} ${className}`}
    >
      {children}
    </div>
  );
}

/** El listón de cierre al final de una página -- mismo texto en todos lados. */
export function ClosingRibbon({ className = "" }: { className?: string }) {
  return (
    <div
      className={`rescue-ribbon rescue-display bg-[var(--rescue-accent)] text-[var(--rescue-ink)] text-center py-3 px-4 font-extrabold uppercase text-xs sm:text-sm tracking-wide ${className}`}
    >
      ♥ Adopta · Cambia una vida · Gana un amigo para siempre ♥
    </div>
  );
}
