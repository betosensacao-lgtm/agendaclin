"use server";

import { after } from "next/server";

import { withTenant } from "@/lib/db/tenant";
import {
  cancelBookingByToken,
  getBookingByToken,
} from "@/lib/db/queries/bookings";
import { getClinicBySlug } from "@/lib/db/queries/clinics";
import { sendStaffNotification } from "@/lib/email/send";

export type CancelResult =
  | { ok: true }
  | { ok: false; error: string };

export async function cancelBookingAction(
  clinicSlug: string,
  cancelToken: string,
): Promise<CancelResult> {
  const clinic = await getClinicBySlug(clinicSlug);
  if (!clinic) return { ok: false, error: "Clínica não encontrada." };

  const { details, cancelled } = await withTenant(clinic.id, async (tx) => {
    // Carrega detalhes ANTES de cancelar (pra ter os dados pro email).
    const details = await getBookingByToken(tx, cancelToken);
    const cancelled = await cancelBookingByToken(tx, cancelToken, clinic.id);
    return { details, cancelled };
  });
  if (!cancelled) {
    return {
      ok: false,
      error:
        "Não foi possível cancelar. O agendamento pode já ter sido cancelado ou não pertencer a esta clínica.",
    };
  }

  // Avisa o staff em background.
  if (details && clinic.contactEmail) {
    after(async () => {
      await sendStaffNotification({
        staffEmail: clinic.contactEmail!,
        kind: "cancelled",
        clinicName: clinic.name,
        patientName: details.patientName,
        patientEmail: details.patientEmail,
        patientPhone: details.patientPhone,
        serviceName: details.service.name,
        professionalName: details.professional.name,
        startsAt: details.startsAt,
      });
    });
  }

  return { ok: true };
}
