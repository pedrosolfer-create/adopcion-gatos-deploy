import { WhatsAppGlyph } from "./Doodles";

/** Barra negra inferior con WhatsApp -- "INFORMES · 55 8487 0290" de los
 * flyers de referencia. `phone` en formato legible (se limpia para el link). */
export function WhatsAppBar({
  phone,
  message,
  label = "Informes",
}: {
  phone: string;
  message?: string;
  label?: string;
}) {
  const digits = phone.replace(/\D/g, "");
  const waHref = `https://wa.me/52${digits}${message ? `?text=${encodeURIComponent(message)}` : ""}`;
  return (
    <a
      href={waHref}
      target="_blank"
      rel="noreferrer"
      className="rescue-ribbon flex items-center gap-3 sm:gap-4 bg-[var(--rescue-ink)] text-white px-5 sm:px-7 py-4 hover:opacity-90 transition"
    >
      <span className="w-10 h-10 rounded-full bg-[var(--rescue-accent)] flex items-center justify-center shrink-0">
        <WhatsAppGlyph className="w-6 h-6" color="var(--rescue-ink)" />
      </span>
      <span className="rescue-display font-extrabold text-sm sm:text-base uppercase">{label}</span>
      <span className="ml-auto font-mono font-extrabold text-lg sm:text-2xl text-[var(--rescue-accent)] tracking-wide">
        {phone}
      </span>
    </a>
  );
}
