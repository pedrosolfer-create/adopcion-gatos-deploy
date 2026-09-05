"use client";

/** <select> que envía su <form> en cuanto cambia -- para cambiar el estado
 * de una estrategia/mejora con un clic, sin botón aparte. */
export function AutoSubmitSelect({
  name,
  defaultValue,
  options,
  labels,
}: {
  name: string;
  defaultValue: string;
  options: string[];
  labels: Record<string, string>;
}) {
  return (
    <select
      name={name}
      defaultValue={defaultValue}
      onChange={(e) => e.currentTarget.form?.requestSubmit()}
      className="rounded-md border border-line bg-white px-2 py-1 text-xs font-mono text-ink-soft"
    >
      {options.map((o) => (
        <option key={o} value={o}>
          {labels[o] ?? o}
        </option>
      ))}
    </select>
  );
}
