"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Campo de foto para el alta de gatos en /refugio, con DOS botones:
 * "Tomar foto" (abre la cámara directo) y "Elegir de galería" (abre las
 * fotos guardadas del celular).
 *
 * Por qué dos inputs: el atributo `capture` de <input type="file"> obliga
 * a muchos celulares (sobre todo Android, y también iPhone) a abrir SOLO la
 * cámara, sin dejar escoger una foto ya guardada. Así que usamos un input
 * con `capture` para la cámara y otro sin `capture` para la galería.
 *
 * Solo el input que el usuario usó por última vez lleva el `name` del
 * campo (foto / foto2 / foto3); el otro se limpia y se queda sin `name`,
 * para que el servidor reciba exactamente un archivo por campo, igual que
 * antes -- app/refugio/actions.ts no necesita cambios.
 */
export function FotoGatoInput({ name, label }: { name: string; label: string }) {
  const camaraRef = useRef<HTMLInputElement>(null);
  const galeriaRef = useRef<HTMLInputElement>(null);
  const [origen, setOrigen] = useState<"camara" | "galeria" | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  // Liberar la URL temporal de la vista previa cuando cambie o se desmonte.
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  // Cuando el formulario se envía y React lo resetea, limpiar también la
  // vista previa (el reset nativo ya vacía los inputs de archivo).
  useEffect(() => {
    const form = galeriaRef.current?.form;
    if (!form) return;
    const onReset = () => {
      setOrigen(null);
      setPreview(null);
    };
    form.addEventListener("reset", onReset);
    return () => form.removeEventListener("reset", onReset);
  }, []);

  function elegido(de: "camara" | "galeria") {
    const usado = de === "camara" ? camaraRef.current : galeriaRef.current;
    const otro = de === "camara" ? galeriaRef.current : camaraRef.current;
    const archivo = usado?.files?.[0];
    if (!archivo) return; // canceló el selector: dejar lo que ya había
    if (otro) otro.value = "";
    setOrigen(de);
    setPreview(URL.createObjectURL(archivo));
  }

  function quitar() {
    if (camaraRef.current) camaraRef.current.value = "";
    if (galeriaRef.current) galeriaRef.current.value = "";
    setOrigen(null);
    setPreview(null);
  }

  const boton =
    "flex-1 rounded-lg bg-teal/10 px-2.5 py-2 text-xs font-semibold text-teal-deep text-center cursor-pointer active:bg-teal/20";

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs text-ink-soft">{label}</span>

      {preview ? (
        <div className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt={`Vista previa de ${label}`}
            className="w-16 h-16 rounded-lg object-cover border border-line"
          />
          <button type="button" onClick={quitar} className="text-[11px] font-semibold text-rose">
            Quitar
          </button>
        </div>
      ) : null}

      <div className="flex gap-2">
        <label className={boton}>
          📷 Tomar foto
          <input
            ref={camaraRef}
            type="file"
            accept="image/*"
            capture="environment"
            name={origen === "camara" ? name : undefined}
            onChange={() => elegido("camara")}
            className="sr-only"
          />
        </label>
        <label className={boton}>
          🖼️ De galería
          <input
            ref={galeriaRef}
            type="file"
            accept="image/*"
            name={origen === "galeria" ? name : undefined}
            onChange={() => elegido("galeria")}
            className="sr-only"
          />
        </label>
      </div>
    </div>
  );
}
