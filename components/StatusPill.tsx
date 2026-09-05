type Tone = "good" | "warning" | "critical" | "neutral";

// Paleta de estado reservada (dataviz skill) -- nunca se reutiliza para
// series de datos, y siempre va acompañada de ícono + etiqueta de texto,
// nunca solo el color.
const TONE_STYLES: Record<Tone, string> = {
  good: "bg-[#e2f5e2] text-[#0a6b0a]",
  warning: "bg-[#fef1d6] text-[#8a5a06]",
  critical: "bg-[#fbe3e3] text-[#a32626]",
  neutral: "bg-paper-alt text-ink-soft",
};

const TONE_ICON: Record<Tone, string> = {
  good: "●",
  warning: "◐",
  critical: "○",
  neutral: "·",
};

const STRATEGY_TONE: Record<string, Tone> = {
  IDEA: "neutral",
  EN_PRUEBA: "warning",
  ACTIVA: "good",
  PAUSADA: "neutral",
  DESCARTADA: "critical",
};
const STRATEGY_LABEL: Record<string, string> = {
  IDEA: "Idea",
  EN_PRUEBA: "En prueba",
  ACTIVA: "Activa",
  PAUSADA: "Pausada",
  DESCARTADA: "Descartada",
};

const IMPROVEMENT_TONE: Record<string, Tone> = {
  PROPUESTA: "neutral",
  EN_PROGRESO: "warning",
  IMPLEMENTADA: "good",
  DESCARTADA: "critical",
};
const IMPROVEMENT_LABEL: Record<string, string> = {
  PROPUESTA: "Propuesta",
  EN_PROGRESO: "En progreso",
  IMPLEMENTADA: "Implementada",
  DESCARTADA: "Descartada",
};

const PEDIDO_TONE: Record<string, Tone> = {
  PENDIENTE_PAGO: "warning",
  PAGADO: "good",
  CANCELADO: "critical",
};
const PEDIDO_LABEL: Record<string, string> = {
  PENDIENTE_PAGO: "Pendiente de pago",
  PAGADO: "Pagado",
  CANCELADO: "Cancelado",
};

export function PedidoStatusPill({ status }: { status: string }) {
  const tone = PEDIDO_TONE[status] ?? "neutral";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-mono font-medium ${TONE_STYLES[tone]}`}>
      <span aria-hidden>{TONE_ICON[tone]}</span>
      {PEDIDO_LABEL[status] ?? status}
    </span>
  );
}

export const PEDIDO_STATUSES = Object.keys(PEDIDO_LABEL);
export { PEDIDO_LABEL };

export function StrategyStatusPill({ status }: { status: string }) {
  const tone = STRATEGY_TONE[status] ?? "neutral";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-mono font-medium ${TONE_STYLES[tone]}`}>
      <span aria-hidden>{TONE_ICON[tone]}</span>
      {STRATEGY_LABEL[status] ?? status}
    </span>
  );
}

export function ImprovementStatusPill({ status }: { status: string }) {
  const tone = IMPROVEMENT_TONE[status] ?? "neutral";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-mono font-medium ${TONE_STYLES[tone]}`}>
      <span aria-hidden>{TONE_ICON[tone]}</span>
      {IMPROVEMENT_LABEL[status] ?? status}
    </span>
  );
}

export const STRATEGY_STATUSES = Object.keys(STRATEGY_LABEL);
export const IMPROVEMENT_STATUSES = Object.keys(IMPROVEMENT_LABEL);
export { STRATEGY_LABEL, IMPROVEMENT_LABEL };
