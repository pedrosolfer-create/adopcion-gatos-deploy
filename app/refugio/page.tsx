import {
  getRefugioById,
  listGatosByRefugio,
  listDailyReports,
  listLeads,
  countLeadsSince,
  type GatoEstado,
} from "@/lib/db";
import { computeKpis, trendSeries, totalForReport } from "@/lib/reportes";
import { getSession } from "@/lib/auth";
import { StatTile } from "@/components/StatTile";
import { TrendChart } from "@/components/TrendChart";
import { LoginForm } from "@/components/LoginForm";
import {
  addGatoAction,
  addRefugioReportAction,
  refugioLoginAction,
  refugioLogoutAction,
  updateGatoEstadoAction,
} from "./actions";

export const dynamic = "force-dynamic";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function formatLong(date: string) {
  const d = new Date(date + "T00:00:00");
  return d.toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" });
}

const GATO_ESTADO_LABEL: Record<GatoEstado, string> = {
  DISPONIBLE: "Disponible",
  EN_PROCESO: "En proceso de adopción",
  ADOPTADO: "Adoptado",
  NO_DISPONIBLE: "No disponible",
};

export default async function RefugioPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; gatoError?: string }>;
}) {
  const session = await getSession();
  if (session?.role !== "refugio") {
    const { error } = await searchParams;
    return (
      <LoginForm
        action={refugioLoginAction}
        title="Acceso del refugio"
        subtitle="Tus gatos, tus reportes, tu propia valoración -- solo lo tuyo."
        withUsuario
        hasError={error === "1"}
        registerHref="/refugio/registro"
      />
    );
  }

  const refugio = await getRefugioById(session.refugioId);
  if (!refugio) {
    // La sesión apunta a un refugio que ya no existe (se borró de la BD).
    return (
      <LoginForm
        action={refugioLoginAction}
        title="Acceso del refugio"
        subtitle="Esta sesión ya no es válida -- entra de nuevo."
        withUsuario
        registerHref="/refugio/registro"
      />
    );
  }

  const gatos = await listGatosByRefugio(refugio.id);
  const reports = await listDailyReports(30, refugio.id);
  const leads = await listLeads(20, refugio.id);
  const kpis = computeKpis(reports);
  const trend = trendSeries(reports, 14);
  const since30d = new Date();
  since30d.setDate(since30d.getDate() - 30);
  const leadsLast30 = await countLeadsSince(since30d.toISOString(), refugio.id);
  const { gatoError } = await searchParams;

  return (
    <main className="mx-auto w-full max-w-5xl px-4 sm:px-6 py-8 sm:py-12 flex flex-col gap-10">
      <header className="flex items-start justify-between gap-4">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wide text-ochre mb-1">
            Sistema de adopción de gatos · Refugio
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-teal-deep">
            {refugio.nombre}
          </h1>
          <p className="mt-1.5 text-sm text-ink-soft max-w-2xl">
            Esta vista solo muestra los gatos, reportes y candidatos de tu refugio.
          </p>
        </div>
        <form action={refugioLogoutAction}>
          <button type="submit" className="text-xs font-mono font-semibold text-ink-soft hover:text-rose shrink-0">
            Salir →
          </button>
        </form>
      </header>

      {/* ---------- Datos del refugio ---------- */}
      <section className="rounded-xl border border-line bg-white p-4 sm:p-5 grid sm:grid-cols-2 gap-x-8 gap-y-2 text-sm">
        <h2 className="sm:col-span-2 text-sm font-bold text-teal-deep mb-1">Datos del refugio</h2>
        <div>
          <span className="text-ink-soft">Responsable: </span>
          <span className="font-medium text-ink">{refugio.responsableNombre}</span>
        </div>
        <div>
          <span className="text-ink-soft">Ciudad: </span>
          <span className="font-medium text-ink">{refugio.ciudad ?? "—"}</span>
        </div>
        <div>
          <span className="text-ink-soft">Teléfono: </span>
          <span className="font-medium text-ink">{refugio.responsableTelefono ?? "—"}</span>
        </div>
        <div>
          <span className="text-ink-soft">Correo: </span>
          <span className="font-medium text-ink">{refugio.responsableEmail ?? "—"}</span>
        </div>
        <p className="sm:col-span-2 text-xs text-muted mt-1">
          Para cambiar estos datos, pídeselo al equipo por ahora -- la edición desde aquí mismo
          todavía no está construida (queda anotada como mejora pendiente).
        </p>
      </section>

      {/* ---------- Mis gatos ---------- */}
      <section className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-bold text-teal-deep">Mis gatos</h2>
          <details className="group" open={gatoError === "foto" || undefined}>
            <summary className="cursor-pointer text-xs font-mono font-semibold text-teal list-none [&::-webkit-details-marker]:hidden">
              + Agregar gato
            </summary>
            <form
              action={addGatoAction}
              encType="multipart/form-data"
              className="mt-3 rounded-xl border border-line bg-white p-4 flex flex-col gap-3 text-sm"
            >
              {gatoError === "foto" && (
                <p className="text-xs font-semibold text-rose bg-rose/10 rounded-lg px-3 py-2">
                  No se pudo subir la foto (puede ser que pese más de 8MB o que no sea una
                  imagen). El gato no se guardó -- intenta de nuevo, si quieres sin foto por
                  ahora.
                </p>
              )}
              <div className="grid sm:grid-cols-2 gap-3">
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-ink-soft">Nombre</span>
                  <input name="nombre" required className="input" />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-ink-soft">Sexo</span>
                  <input name="sexo" className="input" placeholder="Macho / Hembra" />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-ink-soft">Edad aproximada</span>
                  <input name="edadAprox" className="input" placeholder="Ej. 1 año aprox." />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-ink-soft">Estado</span>
                  <select name="estado" defaultValue="DISPONIBLE" className="input">
                    {Object.entries(GATO_ESTADO_LABEL).map(([k, label]) => (
                      <option key={k} value={k}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-ink-soft">Descripción</span>
                <textarea name="descripcion" rows={2} className="input" />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-ink-soft">Foto (opcional)</span>
                <input
                  type="file"
                  name="foto"
                  accept="image/*"
                  capture="environment"
                  className="input file:mr-3 file:rounded-lg file:border-0 file:bg-teal/10 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-teal-deep"
                />
                <span className="text-[11px] text-muted">
                  Desde tu celular, esto te deja tomar la foto en el momento o elegir una que ya
                  tengas guardada. Un gato con foto se ve en la sección pública de adopción; sin
                  foto, no aparece ahí (sigue apareciendo aquí en tu panel).
                </span>
              </label>
              <button type="submit" className="btn-primary self-start">Guardar gato</button>
            </form>
          </details>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {gatos.length === 0 && <p className="text-sm text-ink-soft">Aún no has dado de alta ningún gato.</p>}
          {gatos.map((g) => (
            <div key={g.id} className="rounded-xl border border-line bg-white p-4 flex flex-col gap-1.5">
              <div className="flex items-start gap-3">
                {g.fotoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={g.fotoUrl}
                    alt={g.nombre}
                    className="w-14 h-14 rounded-lg object-cover border border-line shrink-0"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-lg bg-paper-alt border border-line shrink-0 flex items-center justify-center text-[10px] text-muted text-center px-1">
                    Sin foto
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-ink truncate">{g.nombre}</h3>
                  <p className="text-xs text-ink-soft">
                    {[g.sexo, g.edadAprox].filter(Boolean).join(" · ") || "—"}
                  </p>
                </div>
              </div>
              {g.descripcion && <p className="text-sm text-ink-soft">{g.descripcion}</p>}
              <form action={updateGatoEstadoAction} className="flex items-center gap-2 mt-1">
                <input type="hidden" name="gatoId" value={g.id} />
                <select
                  name="estado"
                  defaultValue={g.estado}
                  className="input !py-1 !text-xs flex-1"
                >
                  {Object.entries(GATO_ESTADO_LABEL).map(([k, label]) => (
                    <option key={k} value={k}>
                      {label}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  className="text-[11px] font-mono font-semibold text-teal shrink-0"
                >
                  Actualizar
                </button>
              </form>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- Valoración / reportes del refugio ---------- */}
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-bold text-teal-deep">Valoración y reportes</h2>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatTile label="Candidatos, últimos 7 días" value={String(kpis.totalLast7)} accent="teal" />
          <StatTile label="Promedio diario" value={kpis.avgPerDay.toFixed(1)} />
          <StatTile
            label="Vs. semana anterior"
            value={kpis.trendPct === null ? "—" : `${kpis.trendPct >= 0 ? "+" : ""}${kpis.trendPct.toFixed(0)}%`}
            accent={kpis.trendPct === null ? "ink" : kpis.trendPct >= 0 ? "teal" : "rose"}
            sub={kpis.totalPrev7 ? `${kpis.totalPrev7} la semana pasada` : "sin datos previos"}
          />
          <StatTile
            label="Candidatos en 30 días"
            value={String(leadsLast30)}
            sub={`${leads.length} solicitudes recibidas`}
            accent="ochre"
          />
        </div>

        <div className="rounded-xl border border-line bg-white p-4 sm:p-5">
          <h3 className="text-sm font-bold text-ink mb-3">Candidatos por día — últimos 14 días</h3>
          <TrendChart data={trend} />
        </div>

        <div className="flex items-baseline justify-between mt-2">
          <h3 className="text-sm font-bold text-ink">Bitácora del refugio</h3>
          <details className="group">
            <summary className="cursor-pointer text-xs font-mono font-semibold text-teal list-none [&::-webkit-details-marker]:hidden">
              + Agregar reporte del día
            </summary>
            <form action={addRefugioReportAction} className="mt-3 rounded-xl border border-line bg-white p-4 flex flex-col gap-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-ink-soft">Fecha</span>
                  <input type="date" name="date" defaultValue={todayISO()} required className="input" />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-ink-soft">Candidatos de hoy</span>
                  <input type="number" min={0} name="candidatesFormulario" defaultValue={0} className="input" />
                </label>
              </div>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-ink-soft">Resumen del día</span>
                <textarea name="summary" required rows={2} className="input" placeholder="Qué pasó hoy con tus gatos y candidatos." />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-ink-soft">Próximos pasos (opcional)</span>
                <textarea name="nextSteps" rows={2} className="input" />
              </label>
              <button type="submit" className="btn-primary self-start">Guardar reporte</button>
            </form>
          </details>
        </div>

        <div className="flex flex-col divide-y divide-line rounded-xl border border-line bg-white">
          {reports.length === 0 && (
            <p className="p-4 text-sm text-ink-soft">Aún no hay reportes de tu refugio. Agrega el primero arriba.</p>
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
    </main>
  );
}
