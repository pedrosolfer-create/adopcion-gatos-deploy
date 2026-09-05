const ERROR_MESSAGES: Record<string, string> = {
  faltan_datos: "Faltan datos obligatorios (nombre, usuario, password y responsable).",
  password_corta: "La password debe tener al menos 6 caracteres.",
  usuario_tomado: "Ese usuario ya está en uso -- elige otro.",
};

export function RegistroForm({
  action,
  error,
}: {
  action: (formData: FormData) => void;
  error?: string;
}) {
  return (
    <main className="min-h-screen flex items-center justify-center bg-paper px-4 py-10">
      <form
        action={action}
        className="w-full max-w-md rounded-xl border border-line bg-white p-6 flex flex-col gap-4"
      >
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wide text-ochre mb-1">
            Sistema de adopción de gatos
          </div>
          <h1 className="font-display text-xl font-extrabold text-teal-deep">
            Registra tu refugio
          </h1>
          <p className="mt-1 text-sm text-ink-soft">
            Crea tu acceso para empezar a guardar tus gatos, fotos y reportes.
          </p>
        </div>

        {error && (
          <p className="text-sm text-rose font-semibold">
            {ERROR_MESSAGES[error] ?? "No se pudo completar el registro, intenta de nuevo."}
          </p>
        )}

        <label className="flex flex-col gap-1">
          <span className="text-xs text-ink-soft">Nombre del refugio *</span>
          <input name="nombre" required className="input" />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-ink-soft">Usuario *</span>
            <input name="usuario" required className="input" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-ink-soft">Password *</span>
            <input name="password" type="password" required minLength={6} className="input" />
          </label>
        </div>

        <label className="flex flex-col gap-1">
          <span className="text-xs text-ink-soft">Nombre del responsable *</span>
          <input name="responsableNombre" required className="input" />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-ink-soft">Teléfono (opcional)</span>
            <input name="responsableTelefono" className="input" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-ink-soft">Correo (opcional)</span>
            <input name="responsableEmail" type="email" className="input" />
          </label>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-ink-soft">Ciudad (opcional)</span>
            <input name="ciudad" className="input" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-ink-soft">Dirección (opcional)</span>
            <input name="direccion" className="input" />
          </label>
        </div>

        <button type="submit" className="btn-primary">
          Registrar refugio
        </button>

        <a
          href="/refugio"
          className="text-center text-xs font-semibold text-teal hover:text-teal-deep hover:underline"
        >
          Ya tengo cuenta -- entrar
        </a>
      </form>
    </main>
  );
}
