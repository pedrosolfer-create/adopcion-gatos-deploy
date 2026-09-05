/** Formatea centavos (enteros) como pesos mexicanos, ej. 15000 -> "$150.00". */
export function formatMXN(centavos: number): string {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(centavos / 100);
}

/** Convierte un string de pesos (lo que escribe alguien en un <input>) a centavos enteros. */
export function pesosToCentavos(pesosStr: string): number {
  const pesos = Number(pesosStr);
  if (!Number.isFinite(pesos) || pesos < 0) return 0;
  return Math.round(pesos * 100);
}
