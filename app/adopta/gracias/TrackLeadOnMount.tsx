"use client";

import { useEffect } from "react";
import { trackAdoptionLead } from "@/components/AdPixels";

/** Dispara el evento de conversión una sola vez al cargar la página de
 * gracias -- es decir, solo cuando alguien de verdad terminó el formulario. */
export function TrackLeadOnMount() {
  useEffect(() => {
    trackAdoptionLead();
  }, []);
  return null;
}
