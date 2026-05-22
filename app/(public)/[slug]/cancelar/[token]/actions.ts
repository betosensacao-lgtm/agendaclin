"use server";

import { cancelBookingByToken } from "@/lib/db/queries/bookings";
import { getClinicBySlug } from "@/lib/db/queries/clinics";

export type CancelResult =
  | { ok: true }
  | { ok: false; error: string };

export async function cancelBookingAction(
  clinicSlug: string,
  cancelToken: string,
): Promise<CancelResult> {
  const clinic = await getClinicBySlug(clinicSlug);
  if (!clinic) return { ok: false, error: "Clínica não encontrada." };

  const cancelled = await cancelBookingByToken(cancelToken, clinic.id);
  if (!cancelled) {
    return {
      ok: false,
      error:
        "Não foi possível cancelar. O agendamento pode já ter sido cancelado ou não pertencer a esta clínica.",
    };
  }

  return { ok: true };
}
