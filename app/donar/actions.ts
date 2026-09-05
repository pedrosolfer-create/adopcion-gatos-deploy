"use server";

import { redirect } from "next/navigation";
import { createDonativo, setDonativoPreferenceId } from "@/lib/db";
import { isMercadoPagoConfigured, crearPreferenciaDonativo } from "@/lib/mercadopago";
import { pesosToCentavos } from "@/lib/money";

function str(fd: FormData, key: string): string {
  return String(fd.get(key) ?? "").trim();
}

const MONTO_MIN_CENTAVOS = 20 * 100; // $20 MXN -- por debajo de esto no vale la pena la comisión de la pasarela.
const MONTO_MAX_CENTAVOS = 50000 * 100; // $50,000 MXN -- techo de cordura para "otra cantidad".

/**
 * Crea el registro del donativo (siempre, para tener rastro incluso si
 * Mercado Pago falla o no está configurado) y manda al donante a pagar:
 * - Si Mercado Pago está configurado, a su checkout hospedado (tarjeta con
 *   Apple Pay/Google Pay si el celular lo soporta, OXXO, SPEI -- todo eso
 *   lo arma Mercado Pago, no este código).
 * - Si no, a /donar/manual, con el concepto y monto ya elegidos, para que
 *   el donante escriba por WhatsApp y el equipo cierre el donativo a mano
 *   (mismo espíritu que "Ningún checkout falso" del resto del sitio).
 *
 * OJO con el orden: redirect() se llama SIEMPRE fuera de cualquier
 * try/catch (arma `destino` primero) -- llamarlo dentro de un try lo haría
 * caer en el catch por error, ya que redirect() funciona lanzando una
 * excepción interna de Next.js.
 */
export async function iniciarDonativoAction(formData: FormData) {
  const concepto = str(formData, "concepto") || "Donativo libre";
  const montoCentavos = pesosToCentavos(str(formData, "monto"));

  if (montoCentavos < MONTO_MIN_CENTAVOS || montoCentavos > MONTO_MAX_CENTAVOS) {
    redirect("/?donativoError=monto#dona");
  }

  const donativo = await createDonativo({ concepto, montoCentavos });

  let destino = `/donar/manual?donativo=${donativo.id}`;
  if (isMercadoPagoConfigured()) {
    try {
      const { preferenceId, initPoint } = await crearPreferenciaDonativo({
        donativoId: donativo.id,
        concepto,
        montoCentavos,
      });
      await setDonativoPreferenceId(donativo.id, preferenceId);
      destino = initPoint;
    } catch (err) {
      console.error("CREAR_PREFERENCIA_DONATIVO_FAILED", err);
      // destino ya quedó apuntando a /donar/manual -- se sigue ese camino.
    }
  }

  redirect(destino);
}
