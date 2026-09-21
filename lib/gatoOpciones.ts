/**
 * Opciones fijas para el formulario de alta de gato y para el generador de
 * flyer -- un solo lugar para no repetir las mismas listas en el formulario
 * (app/refugio/page.tsx), la validación (app/refugio/actions.ts) y el
 * template del póster (app/gato/[id]/flyer/route.tsx).
 */

/** Tags de personalidad -- checkboxes de selección múltiple. */
export const PERSONALIDAD_OPCIONES = [
  "Cariñoso",
  "Tranquilo",
  "Juguetón",
  "Sociable",
  "Independiente",
  "Tímido",
  "Curioso",
] as const;

/** Frases de marketing para el flyer -- el refugio elige cuáles aplican a
 * este gato (checkboxes), tomadas de los flyers de referencia que mandó
 * el usuario ("Orange", "Viejito"). El refugio puede elegir más de una. */
export const FRASE_OPCIONES = [
  "Los gatos también cambian vidas",
  "Él/ella solo quiere un hogar",
  "Dulce, cariñoso, tranquilo y especial",
  "También merece amor",
  "Urge una casa que quiera recibir mucho amor",
  "Adopta y dale un final feliz",
] as const;

export type ChecklistSaludKey = "esterilizado" | "desparasitado" | "vacunado" | "sanoListo";

export const CHECKLIST_SALUD: { key: ChecklistSaludKey; label: string }[] = [
  { key: "esterilizado", label: "Esterilizado" },
  { key: "desparasitado", label: "Desparasitado" },
  { key: "vacunado", label: "Vacunado" },
  { key: "sanoListo", label: "Sano y listo para su nueva familia" },
];

/** Tipos de vacuna más comunes en gatos en México -- el campo del
 * formulario sigue aceptando texto libre (por si el refugio necesita otra
 * distinta), esto solo llena un <select> con las opciones típicas. */
export const TIPOS_VACUNA_COMUNES = [
  "Triple felina (rinotraqueítis, calicivirus, panleucopenia)",
  "Rabia",
  "Leucemia felina (FeLV)",
  "Desparasitante interno",
  "Desparasitante externo",
] as const;
