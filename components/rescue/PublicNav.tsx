import Link from "next/link";

/**
 * Encabezado fijo de la landing pública -- comparten esta misma barra las
 * tres secciones fusionadas (Adopta, Dona, Tienda) para que se sientan un
 * solo sitio. Los dos botones de la derecha (Refugio / Administración) NO
 * llevan a ninguna sección de esta página -- llevan a las rutas protegidas
 * `/refugio` y `/reportes`, que ya piden usuario/contraseña por su cuenta.
 * Este componente no agrega ninguna lógica de sesión nueva, solo el punto
 * de entrada visible para llegar a esos logins desde la página pública.
 */
export function PublicNav() {
  return (
    <header className="sticky top-0 z-30 bg-[var(--rescue-paper)]/95 backdrop-blur border-b border-[var(--rescue-ink)]/10">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
        <a href="#adopta" className="rescue-script text-xl text-[var(--rescue-ink)] shrink-0">
          Adopta Gatos
        </a>

        <nav className="hidden sm:flex items-center gap-5 text-sm font-semibold text-[var(--rescue-ink)]/70">
          <a href="#adopta" className="hover:text-[var(--rescue-ink)] transition-colors">
            Adopta
          </a>
          <a href="#dona" className="hover:text-[var(--rescue-ink)] transition-colors">
            Dona
          </a>
          <a href="#tienda" className="hover:text-[var(--rescue-ink)] transition-colors">
            Tienda
          </a>
        </nav>

        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/refugio"
            className="rounded-md border border-[var(--rescue-ink)]/20 px-2.5 py-1.5 text-xs font-semibold text-[var(--rescue-ink)]/80 hover:bg-white transition-colors"
          >
            Soy refugio
          </Link>
          <Link
            href="/reportes"
            className="rounded-md border border-[var(--rescue-ink)]/20 px-2.5 py-1.5 text-xs font-semibold text-[var(--rescue-ink)]/80 hover:bg-white transition-colors"
          >
            Administración
          </Link>
        </div>
      </div>
    </header>
  );
}
