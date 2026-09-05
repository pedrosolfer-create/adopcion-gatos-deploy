type SourceRow = { label: string; color: string; total: number };

/**
 * Paleta categórica validada (dataviz skill, orden fijo blue/orange/aqua/
 * yellow/magenta). Tres de los cinco tonos quedan por debajo de 3:1 de
 * contraste sobre el fondo claro -- por eso cada barra lleva su etiqueta y
 * su número directamente encima, nunca solo el color, como pide la regla de
 * "relief" del validador.
 */
export function SourceBreakdown({ rows }: { rows: SourceRow[] }) {
  const max = Math.max(...rows.map((r) => r.total), 1);
  const total = rows.reduce((s, r) => s + r.total, 0);

  return (
    <div className="flex flex-col gap-3">
      {rows.map((r) => (
        <div key={r.label}>
          <div className="flex items-baseline justify-between text-sm mb-1">
            <span className="font-medium text-ink">{r.label}</span>
            <span className="font-mono text-ink-soft tabular-nums">
              {r.total}
              {total > 0 && <span className="text-muted"> · {Math.round((r.total / total) * 100)}%</span>}
            </span>
          </div>
          <div className="h-2.5 rounded-full bg-paper-alt overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{ width: `${(r.total / max) * 100}%`, background: r.color }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
