"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  upsertDailyReport,
  createGato,
  getGatoById,
  updateGatoEstado,
  verifyRefugioLogin,
  type GatoEstado,
} from "@/lib/db";
import { getSession, setSession, clearSession } from "@/lib/auth";
import { subirFotoGato } from "@/lib/cloudinary";

function str(fd: FormData, key: string): string {
  return String(fd.get(key) ?? "").trim();
}
function num(fd: FormData, key: string): number {
  const v = Number(fd.get(key));
  return Number.isFinite(v) && v >= 0 ? v : 0;
}

/** Devuelve el refugioId de la sesión actual, o null si no hay una sesión
 * de refugio válida. Se revisa dentro de cada acción -- no solo en la
 * página -- porque una acción de servidor se puede invocar directamente. */
async function currentRefugioId(): Promise<string | null> {
  const session = await getSession();
  return session?.role === "refugio" ? session.refugioId : null;
}

export async function refugioLoginAction(formData: FormData) {
  const usuario = str(formData, "usuario");
  const password = String(formData.get("password") ?? "");
  const refugio = await verifyRefugioLogin(usuario, password);
  if (!refugio) {
    redirect("/refugio?error=1");
  }
  await setSession({ role: "refugio", refugioId: refugio.id });
  redirect("/refugio");
}

export async function refugioLogoutAction() {
  await clearSession();
  redirect("/refugio");
}

export async function addGatoAction(formData: FormData) {
  const refugioId = await currentRefugioId();
  if (!refugioId) return;
  const nombre = str(formData, "nombre");
  if (!nombre) return;

  let fotoUrl: string | undefined;
  const foto = formData.get("foto");
  // El input de foto es opcional -- un <input type="file"> vacío llega
  // como un File de tamaño 0, no como null, por eso se checa foto.size.
  if (foto instanceof File && foto.size > 0) {
    try {
      fotoUrl = await subirFotoGato(foto);
    } catch (err) {
      console.error("SUBIR_FOTO_GATO_FAILED", err);
      redirect("/refugio?gatoError=foto");
    }
  }

  await createGato({
    refugioId,
    nombre,
    sexo: str(formData, "sexo") || undefined,
    edadAprox: str(formData, "edadAprox") || undefined,
    descripcion: str(formData, "descripcion") || undefined,
    estado: (str(formData, "estado") as GatoEstado) || "DISPONIBLE",
    fotoUrl,
  });

  revalidatePath("/refugio");
}

/** Cambia el estado de un gato (ej. marcarlo como adoptado) desde el
 * panel del refugio. Antes de tocar nada verifica que el gato sea del
 * refugio de la sesión actual -- sin este chequeo, un refugio podría
 * mandar el id de un gato ajeno y cambiar su estado (el formulario no
 * expone otros ids en su HTML, pero una acción de servidor se puede
 * invocar directamente con cualquier id). */
export async function updateGatoEstadoAction(formData: FormData) {
  const refugioId = await currentRefugioId();
  if (!refugioId) return;
  const gatoId = str(formData, "gatoId");
  const estado = str(formData, "estado") as GatoEstado;
  if (!gatoId || !estado) return;

  const gato = await getGatoById(gatoId);
  if (!gato || gato.refugioId !== refugioId) return;

  await updateGatoEstado(gatoId, estado);
  revalidatePath("/refugio");
}

export async function addRefugioReportAction(formData: FormData) {
  const refugioId = await currentRefugioId();
  if (!refugioId) return;
  const date = str(formData, "date");
  const summary = str(formData, "summary");
  if (!date || !summary) return;

  await upsertDailyReport({
    date,
    refugioId,
    candidatesFormulario: num(formData, "candidatesFormulario"),
    summary,
    nextSteps: str(formData, "nextSteps") || undefined,
  });

  revalidatePath("/refugio");
}
