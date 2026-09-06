import {
  listDailyReports,
  listStrategies,
  listImprovements,
  countLeadsSince,
  listProductosTodos,
  listPedidos,
} from "@/lib/db";
import { computeKpis, trendSeries, totalForReport, SOURCE_META } from "@/lib/reportes";
import { getSession } from "@/lib/auth";
import { formatMXN } from "@/lib/money";
import { isCloudinaryConfigured } from "@/lib/cloudinary";
import { StatTile } from "@/components/StatTile";
import { TrendChart } from "@/components/TrendChart";
import { SourceBreakdown } from "@/components/SourceBreakdown";
import { LoginForm } from "@/components/LoginForm";
import {
  StrategyStatusPill,
  ImprovementStatusPill,
  PedidoStatusPill,
  STRATEGY_STATUSES,
  IMPROVEMENT_STATUSES,
  PEDIDO_STATUSES,
  STRATEGY_LABEL,
  IMPROVEMENT_LABEL,
  PEDIDO_LABEL,
} from "@/components/StatusPill";
import { AutoSubmitSelect } from "@/components/AutoSubmitSelect";
import {
  addDailyReportAction,
  addStrategyAction,
  addImprovementAction,
  changeStrategyStatusAction,
  changeImprovementStatusAction,
  addProductoAction,
  toggleProductoActivoAction,
  changePedidoStatusAction,
  equipoLoginAction,
  equipoLogoutAction,
} from "./actions";

export const dynamic = "force-dynamic";

function formatLong(date: string) {
  const d = new Date(date + "T00:00:00");
  return d.toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" });
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export default async function ReportesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await getSession();
  if (session?.role !== "equipo") {
    const { error } = await searchParams;
    return (
      <LoginForm
        action={equipoLoginAction}
        title="Acceso del equipo"
        subtitle="Reportes, fotos y alarmas de todos los refugios."
        hasError={error === "1"}
      />
    );
  }

  const reports = await listDailyReports(30);
  const strategies = await listStrategies();
  const improvements = await listImprovements();
  const productos = await listProductosTodos();
  const pedidos = await listPedidos(30);
  const cloudinaryConfigurado = isCloudinaryConfigured();
  const totalRefugiosPendiente = pedidos
    .filter((pe) => pe.status === "PAGADO")
    .reduce((sum, pe) => sum + pe.montoRefugiosCentavos, 0);

  const kpis = computeKpis(reports);
  const trend = trendSeries(reports, 14);

  const since30d = new Date();
  since30d.setDate(since30d.getDate() - 30);
  const leadsLast30 = await countLeadsSince(since30d.toISOString());

  return (
    <main className="mx-auto w-full max-w-5xl px-4 sm:px-6 py-8 sm:py-12 flex flex-col gap-10">
      <header className="flex items-start justify-between gap-4">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wide text-ochre mb-1">
            Sistema de adopción de gatos · Equipo
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-teal-deep">
            Avances de la búsqueda de adoptantes
          </h1>
          <p className="mt-1.5 text-sm text-ink-soft max-w-2xl">
            Reporte del día a día, estrategias que se están probando, y el backlog de mejoras
            continuas para que el sistema mismo sea cada vez más eficiente. Esta vista es de
            todos los refugios -- cada refugio tiene su propia vista filtrada en{" "}
            <a href="/refugio" className="underline">
              /refugio
            </a>
            .
          </p>
        </div>
        <form action={equipoLogoutAction}>
          <button type="submit" className="text-xs font-mono font-semibold text-ink-soft hover:text-rose shrink-0">
            Salir →
          </button>
        </form>
      </header>

      {/* ---------- KPIs ---------- */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatTile label="Candidatos, últimos 7 días" value={String(kpis.totalLast7)} accent="teal" />
        <StatTile label="Promedio diario" value={kpis.avgPerDay.toFixed(1)} />
        <StatTile
          label="Vs. semana anterior"
          value={kpis.trendPct === null ? "—" : `${kpis.trendPct >= 0 ? "+" : ""}${kpis.trendPct.toFixed(0)}%`}
          accent={kpis.trendPct === null ? "ink" : kpis.trendPct >= 0 ? "teal" : "rose"}
          sub={kpis.totalPrev7 ? `${kpis.totalPrev7} la semana pasada` : "sin datos previos"}
        />
        <StatTile
          label="Fuente principal (7 días)"
          value={kpis.topSource.total > 0 ? kpis.topSource.label : "—"}
          sub={`${leadsLast30} leads registrados en 30 días`}
          accent="ochre"
        />
      </section>

      {/* ---------- Tendencia + fuentes ---------- */}
      <section className="grid lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3 rounded-xl border border-line bg-white p-4 sm:p-5">
          <h2 className="text-sm font-bold text-ink mb-3">Candidatos por día — últimos 14 días</h2>
          <TrendChart data={trend} />
        </div>
        <div className="lg:col-span-2 rounded-xl border border-line bg-white p-4 sm:p-5">
          <h2 className="text-sm font-bold text-ink mb-3">Por fuente — últimos 7 días</h2>
          <SourceBreakdown rows={kpis.sourceTotals} />
        </div>
      </section>

      {/* ---------- Reportes diarios ---------- */}
      <section className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-bold text-teal-deep">Bitácora diaria</h2>
          <details className="group">
            <summary className="cursor-pointer text-xs font-mono font-semibold text-teal list-none [&::-webkit-details-marker]:hidden">
              + Agregar reporte del día
            </summary>
            <form
              action={addDailyReportAction}
              className="mt-3 rounded-xl border border-line bg-white p-4 flex flex-col gap-3 text-sm"
            >
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-ink-soft">Fecha</span>
                  <input type="date" name="date" defaultValue={todayISO()} required className="input" />
                </label>
                {SOURCE_META.map((s) => (
                  <label key={s.key} className="flex flex-col gap-1">
                    <span className="text-xs text-ink-soft">{s.label}</span>
                    <input type="number" min={0} name={s.key} defaultValue={0} className="input" />
                  </label>
                ))}
              </div>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-ink-soft">Resumen del día</span>
                <textarea name="summary" required rows={2} className="input" placeholder="Qué se hizo, qué funcionó, qué no." />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-ink-soft">Próximos pasos (opcional)</span>
                <textarea name="nextSteps" rows={2} className="input" placeholder="Qué se va a probar mañana." />
              </label>
              <button type="submit" className="btn-primary self-start">Guardar reporte</button>
            </form>
          </details>
        </div>

        <div className="flex flex-col divide-y divide-line rounded-xl border border-line bg-white">
          {reports.length === 0 && (
            <p className="p-4 text-sm text-ink-soft">Aún no hay reportes diarios. Agrega el primero arriba.</p>
          )}
          {reports.map((r) => (
            <div key={r.id} className="p-4 flex flex-col gap-1.5">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm font-semibold text-ink capitalize">{formatLong(r.date)}</span>
                <span className="font-mono text-xs text-teal-deep font-semibold tabular-nums shrink-0">
                  {totalForReport(r)} candidato{totalForReport(r) === 1 ? "" : "s"}
                </span>
              </div>
              <p className="text-sm text-ink-soft">{r.summary}</p>
              {r.nextSteps && (
                <p className="text-xs text-ochre">
                  <span className="font-semibold">Próximo paso: </span>
                  {r.nextSteps}
                </p>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ---------- Estrategias ---------- */}
      <section className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-bold text-teal-deep">Estrategias de captación</h2>
          <details className="group">
            <summary className="cursor-pointer text-xs font-mono font-semibold text-teal list-none [&::-webkit-details-marker]:hidden">
              + Agregar estrategia
            </summary>
            <form action={addStrategyAction} className="mt-3 rounded-xl border border-line bg-white p-4 flex flex-col gap-3 text-sm">
              <label className="flex flex-col gap-1">
                <span className="text-xs text-ink-soft">Título</span>
                <input name="title" required className="input" placeholder="Ej. Publicar en grupo local de Facebook" />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-ink-soft">Descripción</span>
                <textarea name="description" required rows={2} className="input" />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-ink-soft">Canal (opcional)</span>
                <input name="channel" className="input" placeholder="Ej. Instagram, X, boca en boca" />
              </label>
              <button type="submit" className="btn-primary self-start">Guardar estrategia</button>
            </form>
          </details>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          {strategies.length === 0 && (
            <p className="text-sm text-ink-soft">Aún no hay estrategias registradas.</p>
          )}
          {strategies.map((s) => (
            <div key={s.id} className="rounded-xl border border-line bg-white p-4 flex flex-col gap-2">
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-sm font-semibold text-ink">{s.title}</h3>
                <StrategyStatusPill status={s.status} />
              </div>
              <p className="text-sm text-ink-soft">{s.description}</p>
              {s.channel && <p className="text-xs text-muted font-mono">canal: {s.channel}</p>}
              {s.result && <p className="text-xs text-teal-deep">{s.result}</p>}
              <form action={changeStrategyStatusAction} className="mt-1 flex items-center gap-2">
                <input type="hidden" name="id" value={s.id} />
                <span className="text-xs text-muted">Cambiar estado:</span>
                <AutoSubmitSelect
                  name="status"
                  defaultValue={s.status}
                  options={STRATEGY_STATUSES}
                  labels={STRATEGY_LABEL}
                />
              </form>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- Mejoras continuas ---------- */}
      <section className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-bold text-teal-deep">Mejoras continuas del sistema</h2>
          <details className="group">
            <summary className="cursor-pointer text-xs font-mono font-semibold text-teal list-none [&::-webkit-details-marker]:hidden">
              + Agregar mejora
            </summary>
            <form action={addImprovementAction} className="mt-3 rounded-xl border border-line bg-white p-4 flex flex-col gap-3 text-sm">
              <label className="flex flex-col gap-1">
                <span className="text-xs text-ink-soft">Título</span>
                <input name="title" required className="input" placeholder="Ej. Acortar el formulario filtro" />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-ink-soft">Descripción</span>
                <textarea name="description" required rows={2} className="input" />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-ink-soft">Área del sistema</span>
                <input name="area" required className="input" placeholder="Ej. Notificaciones, Captación, Formulario filtro" />
              </label>
              <button type="submit" className="btn-primary self-start">Guardar mejora</button>
            </form>
          </details>
        </div>
        <p className="text-xs text-ink-soft -mt-2">
          Este backlog es el mecanismo de mejora continua: cada idea que se prueba se marca implementada
          con su impacto medible, o descartada con la razón -- así el sistema deja evidencia de qué lo hizo
          más eficiente y qué no funcionó.
        </p>

        <div className="grid sm:grid-cols-2 gap-3">
          {improvements.length === 0 && (
            <p className="text-sm text-ink-soft">Aún no hay mejoras registradas.</p>
          )}
          {improvements.map((im) => (
            <div key={im.id} className="rounded-xl border border-line bg-white p-4 flex flex-col gap-2">
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-sm font-semibold text-ink">{im.title}</h3>
                <ImprovementStatusPill status={im.status} />
              </div>
              <p className="text-sm text-ink-soft">{im.description}</p>
              <p className="text-xs text-muted font-mono">área: {im.area}</p>
              {im.impact && <p className="text-xs text-teal-deep">↳ {im.impact}</p>}
              <form action={changeImprovementStatusAction} className="mt-1 flex items-center gap-2">
                <input type="hidden" name="id" value={im.id} />
                <span className="text-xs text-muted">Cambiar estado:</span>
                <AutoSubmitSelect
                  name="status"
                  defaultValue={im.status}
                  options={IMPROVEMENT_STATUSES}
                  labels={IMPROVEMENT_LABEL}
                />
              </form>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- Tienda ---------- */}
      <section className="flex flex-col gap-3 pb-8">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-bold text-teal-deep">Tienda</h2>
          <details className="group">
            <summary className="cursor-pointer text-xs font-mono font-semibold text-teal list-none [&::-webkit-details-marker]:hidden">
              + Agregar producto
            </summary>
            <form action={addProductoAction} className="mt-3 rounded-xl border border-line bg-white p-4 flex flex-col gap-3 text-sm">
              <label className="flex flex-col gap-1">
                <span className="text-xs text-ink-soft">Nombre</span>
                <input name="nombre" required className="input" placeholder="Ej. Croquetas 1kg" />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-ink-soft">Descripción (opcional)</span>
                <textarea name="descripcion" rows={2} className="input" />
              </label>
              <div className="grid grid-cols-3 gap-3">
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-ink-soft">Precio normal (MXN)</span>
                  <input name="precioNormal" type="number" min={0} step="0.01" required className="input" />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-ink-soft">Precio adoptante (MXN)</span>
                  <input name="precioAdoptante" type="number" min={0} step="0.01" required className="input" />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-ink-soft">Stock (opcional)</span>
                  <input name="stock" type="number" min={0} className="input" />
                </label>
              </div>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-ink-soft">URL de foto (opcional)</span>
                <input name="fotoUrl" className="input" placeholder="Ej. /tienda/cat-chow-9kg.png" />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-ink-soft">
                  O sube una foto{!cloudinaryConfigurado && " (requiere Cloudinary configurado -- ver .env.example)"}
                </span>
                <input name="foto" type="file" accept="image/*" disabled={!cloudinaryConfigurado} className="input" />
              </label>
              <button type="submit" className="btn-primary self-start">Guardar producto</button>
            </form>
          </details>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          {productos.length === 0 && <p className="text-sm text-ink-soft">Aún no hay productos en la tienda.</p>}
          {productos.map((p) => (
            <div key={p.id} className="rounded-xl border border-line bg-white p-4 flex flex-col gap-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  {p.fotoUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.fotoUrl}
                      alt={p.nombre}
                      className="w-10 h-10 rounded-lg object-cover border border-line shrink-0"
                    />
                  )}
                  <h3 className="text-sm font-semibold text-ink">{p.nombre}</h3>
                </div>
                <span
                  className={`text-[11px] font-mono font-semibold shrink-0 ${p.activo ? "text-teal-deep" : "text-muted"}`}
                >
                  {p.activo ? "Visible en /tienda" : "Oculto"}
                </span>
              </div>
              {p.descripcion && <p className="text-sm text-ink-soft">{p.descripcion}</p>}
              <p className="text-xs font-mono text-ink-soft">
                Normal: {formatMXN(p.precioNormalCentavos)} · Adoptante: {formatMXN(p.precioAdoptanteCentavos)}
                {p.stock !== null && ` · Stock: ${p.stock}`}
              </p>
              <form action={toggleProductoActivoAction} className="mt-1">
                <input type="hidden" name="id" value={p.id} />
                <input type="hidden" name="activo" value={p.activo ? "0" : "1"} />
                <button type="submit" className="text-xs font-mono font-semibold text-teal hover:text-rose">
                  {p.activo ? "Ocultar de la tienda" : "Mostrar en la tienda"}
                </button>
              </form>
            </div>
          ))}
        </div>

        <h3 className="text-sm font-bold text-ink mt-2">Pedidos</h3>
        <p className="text-xs text-ink-soft -mt-2">
          Si Mercado Pago está configurado, el pedido se cobra en línea (tarjeta, OXXO o SPEI) y el
          estado se actualiza solo cuando Mercado Pago confirma el pago. Si no está configurado, el
          pedido nace &ldquo;Pendiente de pago&rdquo; y el comprador te escribe por WhatsApp --
          contacta para coordinar cómo paga y cambia el estado aquí a mano.
        </p>
        <p className="text-xs font-mono font-semibold text-teal-deep -mt-1">
          Para refugios, de pedidos ya pagados: {formatMXN(totalRefugiosPendiente)} (10% de cada
          venta -- ver nota abajo).
        </p>
        <p className="text-[11px] text-muted -mt-2">
          Esto es un monto de referencia para que el equipo transfiera manualmente a los refugios --
          el pago completo del comprador entra a la cuenta de Mercado Pago del sitio, no hay reparto
          automático todavía.
        </p>
        <div className="flex flex-col divide-y divide-line rounded-xl border border-line bg-white">
          {pedidos.length === 0 && <p className="p-4 text-sm text-ink-soft">Aún no hay pedidos.</p>}
          {pedidos.map((pe) => (
            <div key={pe.id} className="p-4 flex flex-col gap-1.5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="text-sm font-semibold text-ink">{pe.compradorNombre}</span>
                  {pe.esAdoptante && (
                    <span className="ml-2 text-[11px] font-mono text-teal-deep">adoptante</span>
                  )}
                  <p className="text-xs text-muted font-mono">
                    {[pe.compradorTelefono, pe.compradorEmail].filter(Boolean).join(" · ") || "sin contacto"}
                  </p>
                </div>
                <span className="font-mono text-sm text-teal-deep font-semibold tabular-nums shrink-0">
                  {formatMXN(pe.totalCentavos)}
                </span>
              </div>
              <ul className="text-xs text-ink-soft">
                {pe.items.map((it) => (
                  <li key={it.productoId}>
                    {it.cantidad}× {it.nombre} ({formatMXN(it.precioUnitarioCentavos)} c/u)
                  </li>
                ))}
              </ul>
              <p className="text-[11px] font-mono text-teal">
                Para refugios: {formatMXN(pe.montoRefugiosCentavos)}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <PedidoStatusPill status={pe.status} />
                <form action={changePedidoStatusAction} className="flex items-center gap-2">
                  <input type="hidden" name="id" value={pe.id} />
                  <span className="text-xs text-muted">Cambiar estado:</span>
                  <AutoSubmitSelect
                    name="status"
                    defaultValue={pe.status}
                    options={PEDIDO_STATUSES}
                    labels={PEDIDO_LABEL}
                  />
                </form>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
