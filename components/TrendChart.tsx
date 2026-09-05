type Point = { date: string; total: number };

function formatShort(date: string) {
  const d = new Date(date + "T00:00:00");
  return d.toLocaleDateString("es-MX", { day: "2-digit", month: "2-digit" });
}

/**
 * Barras de candidatos por día (últimos N días). Un solo color (magnitud vía
 * altura, no vía tono) -- no hace falta rampa ni leyenda para una sola serie.
 * Cada barra lleva <title> nativo como tooltip accesible sin JS de cliente;
 * ver "Mejoras continuas" para la versión con tooltip enriquecido.
 */
export function TrendChart({ data }: { data: Point[] }) {
  if (data.length === 0) {
    return <p className="text-sm text-ink-soft">Todavía no hay reportes diarios cargados.</p>;
  }

  const max = Math.max(...data.map((d) => d.total), 1);
  const avg = data.reduce((s, d) => s + d.total, 0) / data.length;

  const W = 700;
  const H = 180;
  const padTop = 24;
  const padBottom = 28;
  const plotH = H - padTop - padBottom;
  const gap = 6;
  const barW = W / data.length - gap;

  const yFor = (v: number) => padTop + plotH - (v / max) * plotH;
  const avgY = yFor(avg);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Candidatos por día">
      <line
        x1={0}
        x2={W}
        y1={avgY}
        y2={avgY}
        stroke="var(--color-line)"
        strokeWidth={1}
        strokeDasharray="4 4"
      />
      <text x={W} y={avgY - 5} textAnchor="end" className="fill-muted" fontSize="9" fontFamily="var(--font-mono)">
        promedio {avg.toFixed(1)}
      </text>

      {data.map((d, i) => {
        const x = i * (barW + gap);
        const y = yFor(d.total);
        const h = padTop + plotH - y;
        const isLast = i === data.length - 1;
        const showLabel = d.total === max || isLast;
        return (
          <g key={d.date}>
            <title>{`${formatShort(d.date)}: ${d.total} candidato${d.total === 1 ? "" : "s"}`}</title>
            <rect
              x={x}
              y={y}
              width={Math.max(barW, 2)}
              height={Math.max(h, 2)}
              rx={4}
              fill={isLast ? "var(--color-teal)" : "var(--color-teal)"}
              opacity={isLast ? 1 : 0.85}
            />
            {showLabel && d.total > 0 && (
              <text
                x={x + barW / 2}
                y={y - 6}
                textAnchor="middle"
                className="fill-ink"
                fontSize="10"
                fontFamily="var(--font-mono)"
                fontWeight={600}
              >
                {d.total}
              </text>
            )}
            {(i % 2 === 0 || data.length <= 7) && (
              <text
                x={x + barW / 2}
                y={H - 8}
                textAnchor="middle"
                className="fill-muted"
                fontSize="9"
                fontFamily="var(--font-mono)"
              >
                {formatShort(d.date)}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
