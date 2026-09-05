export function StatTile({
  label,
  value,
  sub,
  accent = "ink",
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: "ink" | "teal" | "ochre" | "rose";
}) {
  const accentClass = {
    ink: "text-ink",
    teal: "text-teal",
    ochre: "text-ochre",
    rose: "text-rose",
  }[accent];

  return (
    <div className="rounded-xl border border-line bg-white p-4 sm:p-5">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">{label}</div>
      <div className={`mt-1.5 font-mono text-2xl sm:text-3xl font-semibold tabular-nums ${accentClass}`}>
        {value}
      </div>
      {sub && <div className="mt-1 text-xs text-ink-soft">{sub}</div>}
    </div>
  );
}
