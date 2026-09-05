import Link from "next/link";
import { TrackLeadOnMount } from "./TrackLeadOnMount";

export default function GraciasPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center text-center px-6 py-20 bg-teal-deep text-white">
      <TrackLeadOnMount />
      <div className="w-14 h-14 rounded-full bg-rose flex items-center justify-center text-2xl font-display font-bold mb-6">
        ✓
      </div>
      <h1 className="font-display text-3xl font-extrabold max-w-md text-balance">
        ¡Gracias! Ya recibimos tu solicitud
      </h1>
      <p className="mt-3 text-paper/85 max-w-md">
        El equipo va a revisar tus respuestas y te contacta pronto por teléfono o correo para
        seguir con el proceso.
      </p>
      <Link href="/adopta" className="mt-8 text-sm font-semibold text-rose-tint underline">
        ← Volver
      </Link>
    </main>
  );
}
