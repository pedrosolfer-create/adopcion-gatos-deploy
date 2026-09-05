export function LoginForm({
  action,
  title,
  subtitle,
  withUsuario,
  hasError,
}: {
  action: (formData: FormData) => void;
  title: string;
  subtitle?: string;
  withUsuario?: boolean;
  hasError?: boolean;
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
      </form>
    </main>
  );
}
