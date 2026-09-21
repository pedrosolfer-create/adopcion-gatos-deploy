import { RibbonBanner } from "@/components/rescue/RibbonBanner";
import { WhatsAppBar } from "@/components/rescue/WhatsAppBar";
import { CONTACTO_WHATSAPP } from "@/lib/contacto";

export default function SuscripcionGraciasPage() {
  return (
    <div className="rescue-theme min-h-screen flex flex-col items-center justify-center px-4 py-16 text-center gap-5">
      <RibbonBanner tone="accent">¡Listo!</RibbonBanner>
      <h1 className="rescue-display text-3xl font-extrabold text-[var(--rescue-ink)] max-w-md">
        Tu suscripción quedó activa
      </h1>
      <p className="text-sm text-[var(--rescue-ink)]/70 max-w-sm">
        Te mandamos un correo con los detalles. Antes de cada cobro te avisamos por correo y por
        WhatsApp -- si necesitas pausar o cancelar, escríbenos.
      </p>
      <div className="w-full max-w-xs">
        <WhatsAppBar phone={CONTACTO_WHATSAPP} message="Hola, tengo una pregunta sobre mi suscripción de reenvío automático" />
      </div>
    </div>
  );
}
