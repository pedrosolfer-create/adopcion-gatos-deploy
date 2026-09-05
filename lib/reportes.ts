import type { DailyReport } from "./db";

export const SOURCE_META = [
  { key: "candidatesFormulario", label: "Formulario del sitio", color: "var(--color-chart-1)" },
  { key: "candidatesWeb", label: "Búsqueda web", color: "var(--color-chart-2)" },
  { key: "candidatesX", label: "X (Twitter)", color: "var(--color-chart-3)" },
  { key: "candidatesReddit", label: "Reddit", color: "var(--color-chart-4)" },
  { key: "candidatesInstagram", label: "Anuncio de Instagram", color: "var(--color-chart-5)" },
] as const;

export function totalForReport(r: DailyReport): number {
  return (
    r.candidatesFormulario +
    r.candidatesX +
    r.candidatesReddit +
    r.candidatesWeb +
    r.candidatesInstagram
  );
}

/**
 * Junta varios DailyReport que caigan en la misma fecha en uno solo,
 * sumando sus candidatos por fuente. Hace falta desde que existe
 * multi-refugio: la vista del equipo (`listDailyReports(30)` sin
 * refugioId) trae TODOS los reportes de TODOS los refugios más el reporte
 * general, así que un mismo día puede tener más de una fila -- sin esto,
 * el KPI de "candidatos últimos 7 días" contaría filas en vez de días
 * (7 filas podría ser solo 5 días reales si dos días tuvieron 2 refugios
 * reportando), y la gráfica de tendencia mostraría dos barras para el
 * mismo día.
 */
function aggregateByDate(reports: DailyReport[]): DailyReport[] {
  const byDate = new Map<string, DailyReport>();
  for (const r of reports) {
    const existing = byDate.get(r.date);
    if (!existing) {
      byDate.set(r.date, { ...r });
      continue;
    }
    byDate.set(r.date, {
      ...existing,
      candidatesFormulario: existing.candidatesFormulario + r.candidatesFormulario,
      candidatesX: existing.candidatesX + r.candidatesX,
      candidatesReddit: existing.candidatesReddit + r.candidatesReddit,
      candidatesWeb: existing.candidatesWeb + r.candidatesWeb,
      candidatesInstagram: existing.candidatesInstagram + r.candidatesInstagram,
    });
  }
  return [...byDate.values()];
}

export function computeKpis(reports: DailyReport[]) {
  const sorted = aggregateByDate(reports).sort((a, b) => (a.date < b.date ? 1 : -1)); // desc
  const last7 = sorted.slice(0, 7);
  const prev7 = sorted.slice(7, 14);

  const totalLast7 = last7.reduce((s, r) => s + totalForReport(r), 0);
  const totalPrev7 = prev7.reduce((s, r) => s + totalForReport(r), 0);
  const avgPerDay = last7.length ? totalLast7 / last7.length : 0;

  let trendPct: number | null = null;
  if (totalPrev7 > 0) trendPct = ((totalLast7 - totalPrev7) / totalPrev7) * 100;

  const sourceTotals = SOURCE_META.map((s) => ({
    ...s,
    total: last7.reduce((sum, r) => sum + (r[s.key as keyof DailyReport] as number), 0),
  }));
  const topSource = [...sourceTotals].sort((a, b) => b.total - a.total)[0];

  return { totalLast7, totalPrev7, avgPerDay, trendPct, sourceTotals, topSource };
}

export function trendSeries(reports: DailyReport[], days = 14) {
  const sorted = aggregateByDate(reports).sort((a, b) => (a.date < b.date ? -1 : 1)); // asc
  return sorted.slice(-days).map((r) => ({ date: r.date, total: totalForReport(r) }));
}
