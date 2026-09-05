"use client";

/** Botón "Eliminar" para un gato del panel del refugio. Pide confirmación
 * con el confirm() nativo del navegador antes de mandar el form -- borrar
 * no tiene deshacer, así que un clic accidental no debe borrar de una vez
 * (ej. útil para quitar altas duplicadas, como cuando el formulario se
 * mandó más de una vez por una conexión lenta). */
export function DeleteGatoButton({ nombre }: { nombre: string }) {
  return (
    <button
      type="submit"
      onClick={(e) => {
        if (!confirm(`¿Borrar a "${nombre}"? Esto no se puede deshacer.`)) {
          e.preventDefault();
        }
      }}
      className="text-[11px] font-mono font-semibold text-rose shrink-0"
    >
      Eliminar
    </button>
  );
}
