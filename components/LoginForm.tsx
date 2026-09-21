export function LoginForm({
  action,
  title,
  subtitle,
  withUsuario,
  hasError,
  registerHref,
  registerLabel,
}: {
  action: (formData: FormData) => void;
  title: string;
  subtitle?: string;
  withUsuario?: boolean;
  hasError?: boolean;
  /** Si se pasa, muestra un link debajo del botón de "Entrar" -- pensado
   * para /refugio, donde un refugio nuevo necesita poder darse de alta él
   * mismo. No se pasa desde /reportes: ahí el login es una sola password
   * compartida del equipo, no algo en lo que alguien nuevo "se registra". */
  registerHref?: string;
  registerLabel?: string;
}) {
  return (
    <main className="min-h-screen flex items-center justify-center bg-paper px-4">
      <form
        action={action}
        className="w-full max-w-sm rounded-xl border border-line bg-white p-6 flex flex-col gap-4"
      >
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wide text-ochre mb-1">
            Sistema de adopción de gatos
          </div>
          <h1 className="font-display text-xl font-extrabold text-teal-deep">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-ink-soft">{subtitle}</p>}
        </div>
        {hasError && (
          <p className="text-sm text-rose font-semibold">Usuario o password incorrectos.</p>
        )}
        {withUsuario && (
          <label className="flex flex-col gap-1">
            <span className="text-xs text-ink-soft">Usuario</span>
            <input name="usuario" required className="input" />
          </label>
        )}
        <label className="flex flex-col gap-1">
          <span className="text-xs text-ink-soft">Password</span>
          <input name="password" type="password" required className="input" />
        </label>
        <button type="submit" className="btn-primary">
          Entrar
        </button>
        {registerHref && (
          <a
            href={registerHref}
            className="text-center text-xs font-semibold text-teal hover:text-teal-deep hover:underline"
          >
            {registerLabel ?? "¿Aún no estás registrado? Regístrate aquí"}
          </a>
        )}
      </form>
    </main>
  );
}
