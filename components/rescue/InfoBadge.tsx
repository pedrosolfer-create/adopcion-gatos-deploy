import type { ReactNode } from "react";

/** Badge con borde punteado -- "4 MESES DE EDAD" en los flyers de referencia. */
export function InfoBadge({ icon, children }: { icon?: ReactNode; children: ReactNode }) {
  return (
    <div className="rescue-badge rescue-display inline-flex items-center gap-2 px-4 py-1.5 font-extrabold text-sm">
      {icon}
      <span>{children}</span>
    </div>
  );
}
