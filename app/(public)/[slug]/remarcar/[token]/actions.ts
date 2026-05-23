/**
 * Server Actions de remarcação de booking.
 *
 *   getSlotsForRescheduleAction  retorna slots disponíveis para a nova data
 *   rescheduleBookingAction      executa a remarcação capturando conflito
 */
"use server";

import { and, eq } from "drizzle-orm";
import { after } from "next/server";
import { z } from "zod";

import { generateSlots } from "@/lib/booking/slots";
import { db } from "@/lib/db";
import { listOverridesAffectingProfessional } from "@/lib/db/queries/availability";
import {
  getBookingByToken,
  getConfirmedBookingsInRange,
  rescheduleBookingByToken,
} from "@/lib/db/queries/bookings";
import { getClinicBySlug } from "@/lib/db/queries/clinics";
import { weeklyAvailability } from "@/lib/db/schema";
import {
  sendBookingConfirmation,
  sendStaffNotification,
} from "@/lib/email/send";

// ---------------------------------------------------------------------------
// getSlotsForRescheduleAction
// ---------------------------------------------------------------------------

export type SlotResult = { startsAt: string; endsAt: string };

export async function getSlotsForRescheduleAction(input: {
  clinicSlug: string;
  cancelToken: string;
  dateLocal: string;
  timezone: string;
}): Promise<SlotResult[]> {
  const clinic = await getClinicBySlug(input.clinicSlug);
  if (!clinic) return [];

  const booking = await getBookingByToken(input.cancelToken);
  if (!booking || booking.status !== "confirmed") return [];

  // Próximo dia (exclusivo).
  const nextDay = (() => {
    const d = new Date(`${input.dateLocal}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + 1);
    return d.toISOString().slice(0, 10);
  })();

  const [weeklyAvail, overrides, otherBookings] = await Promise.all([
    db
      .select()
      .from(weeklyAvailability)
      .where(eq(weeklyAvailability.professionalId, booking.professional.id)),
    listOverridesAffectingProfessional(
      booking.professional.id,
      clinic.id,
    ),
    getConfirmedBookingsInRange(
      booking.professional.id,
      new Date(`${input.dateLocal}T00:00:00Z`),
      new Date(`${nextDay}T06:00:00Z`),
    ),
  ]);

  // IMPORTANTE: removemos o próprio booking da lista de ocupados — senão
  // o próprio slot atual ficaria "ocupado por mim mesmo" no grid.
  const bookingsExcludingSelf = otherBookings.filter(
    (b) =>
      b.startsAt.getTime() !== booking.startsAt.getTime() ||
      b.endsAt.getTime() !== booking.endsAt.getTime(),
  );

  const slots = generateSlots({
    durationMinutes: booking.service.durationMinutes,
    weeklyAvailability: weeklyAvail.map((w) => ({
      weekday: w.weekday,
      startTime: w.startTime,
      endTime: w.endTime,
    })),
    overrides: overrides.map((o) => ({
      startsAt: o.startsAt,
      endsAt: o.endsAt,
    })),
    bookings: bookingsExcludingSelf.map((b) => ({
      startsAt: b.startsAt,
      endsAt: b.endsAt,
    })),
    fromDateLocal: input.dateLocal,
    toDateLocal: nextDay,
    timezone: input.timezone,
  });

  return slots.map((s) => ({
    startsAt: s.start.toISOString(),
    endsAt: s.end.toISOString(),
  }));
}

// ---------------------------------------------------------------------------
// rescheduleBookingAction
// ---------------------------------------------------------------------------

const RescheduleSchema = z.object({
  clinicSlug: z.string().min(1),
  cancelToken: z.uuid(),
  newStartsAt: z.string().datetime(),
});

export type RescheduleResult =
  | { ok: true }
  | { ok: false; error: string };

export async function rescheduleBookingAction(input: {
  clinicSlug: string;
  cancelToken: string;
  newStartsAt: string;
}): Promise<RescheduleResult> {
  const parsed = RescheduleSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Dados inválidos." };
  }
  const data = parsed.data;

  const clinic = await getClinicBySlug(data.clinicSlug);
  if (!clinic) return { ok: false, error: "Clínica não encontrada." };

  const booking = await getBookingByToken(data.cancelToken);
  if (!booking) return { ok: false, error: "Agendamento não encontrado." };
  if (booking.status !== "confirmed") {
    return {
      ok: false,
      error: "Este agendamento não pode ser remarcado (já cancelado/finalizado).",
    };
  }

  const newStartsAt = new Date(data.newStartsAt);
  const newEndsAt = new Date(
    newStartsAt.getTime() + booking.service.durationMinutes * 60_000,
  );

  // Mesmo slot? Sem trabalho.
  if (newStartsAt.getTime() === booking.startsAt.getTime()) {
    return { ok: true };
  }

  try {
    const updated = await rescheduleBookingByToken({
      cancelToken: data.cancelToken,
      clinicId: clinic.id,
      newStartsAt,
      newEndsAt,
    });
    if (!updated) {
      return { ok: false, error: "Não foi possível remarcar." };
    }
  } catch (err: unknown) {
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code: string }).code === "23505"
    ) {
      return {
        ok: false,
        error:
          "Este horário acabou de ser reservado por outra pessoa. Escolha outro.",
      };
    }
    console.error("[rescheduleBookingAction]", err);
    return { ok: false, error: "Erro ao remarcar. Tente novamente." };
  }

  // Dispara emails em background.
  after(async () => {
    // Re-busca pra ter os novos timestamps.
    const updated = await getBookingByToken(data.cancelToken);
    if (!updated) return;

    await sendBookingConfirmation({
      patientEmail: updated.patientEmail,
      patientName: updated.patientName,
      clinicName: clinic.name,
      clinicSlug: clinic.slug,
      clinicAddress: clinic.address,
      serviceName: updated.service.name,
      professionalName: updated.professional.name,
      startsAt: updated.startsAt,
      endsAt: updated.endsAt,
      durationMinutes: updated.service.durationMinutes,
      bookingId: updated.id,
      cancelToken: updated.cancelToken,
    });

    if (clinic.contactEmail) {
      await sendStaffNotification({
        staffEmail: clinic.contactEmail,
        kind: "rescheduled",
        clinicName: clinic.name,
        patientName: updated.patientName,
        patientEmail: updated.patientEmail,
        patientPhone: updated.patientPhone,
        serviceName: updated.service.name,
        professionalName: updated.professional.name,
        startsAt: updated.startsAt,
      });
    }
  });

  return { ok: true };
}
