"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  upsertDailyReport,
  createStrategy,
  createImprovement,
  updateStrategyStatus,
  updateImprovementStatus,
  createProducto,
  setProductoActivo,
  updatePedidoStatus,
  type StrategyStatus,
  type ImprovementStatus,
  type PedidoStatus,
} from "@/lib/db";
import { getSession, setSession, clearSession, verifyEquipoPassword } from "@/lib/auth";
import { pesosToCentavos } from "@/lib/money";
import { subirFotoProducto } from "@/lib/cloudinary";

function str(fd: FormData, key: string): string {
  return String(fd.get(key) ?? "").trim();
}
function num(fd: FormData, key: string): number {
  const v = Number(fd.get(key));
  return Number.isFinite(v) && v >= 0 ? v : 0;
}

/** true si hay una sesión de equipo válida -- se revisa dentro de CADA
 * acción (no solo en la página) porque una acción de servidor se puede
 * invocar directamente sin haber renderizado la página primero. */
async function isEquipo(): Promise<boolean> {
  const session = await getSession();
  return session?.role === "equipo";
}

export async function equipoLoginAction(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  if (!verifyEquipoPassword(password)) {
    redirect("/reportes?error=1");
  }
  await setSession({ role: "equipo" });
  redirect("/reportes");
}

export async function equipoLogoutAction() {
  await clearSession();
  redirect("/reportes");
}

export async function addDailyReportAction(formData: FormData) {
  if (!(await isEquipo())) return;
  const date = str(formData, "date");
  const summary = str(formData, "summary");
  if (!date || !summary) return;

  await upsertDailyReport({
    date,
    candidatesFormulario: num(formData, "candidatesFormulario"),
    candidatesX: num(formData, "candidatesX"),
    candidatesReddit: num(formData, "candidatesReddit"),
    candidatesWeb: num(formData, "candidatesWeb"),
    candidatesInstagram: num(formData, "candidatesInstagram"),
    summary,
    nextSteps: str(formData, "nextSteps") || undefined,
  });

  revalidatePath("/reportes");
}

export async function addStrategyAction(formData: FormData) {
  if (!(await isEquipo())) return;
  const title = str(formData, "title");
  const description = str(formData, "description");
  if (!title || !description) return;

  await createStrategy({
    title,
    description,
    channel: str(formData, "channel") || undefined,
  });

  revalidatePath("/reportes");
}

export async function addImprovementAction(formData: FormData) {
  if (!(await isEquipo())) return;
  const title = str(formData, "title");
  const description = str(formData, "description");
  const area = str(formData, "area");
  if (!title || !description || !area) return;

  await createImprovement({ title, description, area });

  revalidatePath("/reportes");
}

export async function changeStrategyStatusAction(formData: FormData) {
  if (!(await isEquipo())) return;
  const id = str(formData, "id");
  const status = str(formData, "status") as StrategyStatus;
  const result = str(formData, "result");
  if (!id || !status) return;

  await updateStrategyStatus(id, status, result || undefined);
  revalidatePath("/reportes");
}

export async function changeImprovementStatusAction(formData: FormData) {
  if (!(await isEquipo())) return;
  const id = str(formData, "id");
  const status = str(formData, "status") as ImprovementStatus;
  const impact = str(formData, "impact");
  if (!id || !status) return;

  await updateImprovementStatus(id, status, impact || undefined);
  revalidatePath("/reportes");
}

// ---------- Tienda ----------

/** El campo de URL de foto es el camino simple (pegar la ruta de una
 * imagen ya subida, ej. "/tienda/cat-chow-9kg.png" si se agregó como
 * archivo estático del sitio). El de archivo es el camino para el equipo
 * cuando ya tenga Cloudinary configurado y quiera subir una foto real del
 * producto que tiene en existencia -- si se manda un archivo, gana sobre
 * la URL de texto. */
export async function addProductoAction(formData: FormData) {
  if (!(await isEquipo())) return;
  const nombre = str(formData, "nombre");
  if (!nombre) return;

  let fotoUrl = str(formData, "fotoUrl") || undefined;
  const foto = formData.get("foto");
  if (foto instanceof File && foto.size > 0) {
    try {
      fotoUrl = await subirFotoProducto(foto);
    } catch (err) {
      console.error("SUBIR_FOTO_PRODUCTO_FAILED", err);
      redirect("/reportes?error=fotoProducto");
    }
  }

  await createProducto({
    nombre,
    descripcion: str(formData, "descripcion") || undefined,
    precioNormalCentavos: pesosToCentavos(str(formData, "precioNormal")),
    precioAdoptanteCentavos: pesosToCentavos(str(formData, "precioAdoptante")),
    stock: str(formData, "stock") ? num(formData, "stock") : undefined,
    fotoUrl,
  });

  revalidatePath("/reportes");
  revalidatePath("/tienda");
}

export async function toggleProductoActivoAction(formData: FormData) {
  if (!(await isEquipo())) return;
  const id = str(formData, "id");
  const activo = str(formData, "activo") === "1";
  if (!id) return;

  await setProductoActivo(id, activo);
  revalidatePath("/reportes");
  revalidatePath("/tienda");
}

export async function changePedidoStatusAction(formData: FormData) {
  if (!(await isEquipo())) return;
  const id = str(formData, "id");
  const status = str(formData, "status") as PedidoStatus;
  if (!id || !status) return;

  await updatePedidoStatus(id, status);
  revalidatePath("/reportes");
}
