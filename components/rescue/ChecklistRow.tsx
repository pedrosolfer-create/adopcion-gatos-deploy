import type { ReactNode } from "react";

/** Fila de checklist con icono circular + etiqueta + palomita -- el
 * "YA ESTERILIZADO / VACUNADO / DESPARASITADO" de los flyers de referencia. */
export function ChecklistRow({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-dotted border-[var(--rescue-ink)]/25 last:border-b-0">
      <span className="w-9 h-9 rounded-full bg-[var(--rescue-accent)] text-[var(--rescue-ink)] flex items-center justify-center shrink-0">
        {icon}
      </span>
      <span className="rescue-display flex-1 font-bold text-sm uppercase leading-tight">{label}</span>
      <span className="w-6 h-6 rounded-full bg-[var(--rescue-accent)] text-white flex items-center justify-center text-xs font-bold shrink-0">
        ✓
      </span>
    </div>
  );
}
