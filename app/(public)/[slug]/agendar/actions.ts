/**
 * Server Actions do wizard de agendamento público.
 *
 * getAvailableSlotsAction — retorna slots livres para um profissional/dia.
 * createBookingAction     — valida, verifica Turnstile e insere o booking.
 *
 * Segurança:
 *  - Turnstile verifica que o request vem de um browser humano.
 *  - Todos os IDs são validados contra clinic_id (sem vazamento cross-tenant).
 *  - O anti-double-booking é garantido pelo unique partial index no banco;
 *    capturamos o código de erro 23505 e retornamos mensagem amigável.
 */
"use server";

import { and, eq } from "drizzle-orm";
import { after } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import {
  professionals,
  professionalServices,
  services,
  weeklyAvailability,
} from "@/lib/db/schema";
import { listOverridesAffectingProfessional } from "@/lib/db/queries/availability";
import {
  createBooking,
  getBookingByToken,
  getConfirmedBookingsInRange,
} from "@/lib/db/queries/bookings";
import { getClinicBySlug } from "@/lib/db/queries/clinics";
import { generateSlots } from "@/lib/booking/slots";
import {
  sendBookingConfirmation,
  sendStaffNotification,
} from "@/lib/email/send";

// ---------------------------------------------------------------------------
// Utilitários internos
// ---------------------------------------------------------------------------

async function verifyTurnstile(token: string): Promise<boolean> {
  const body = new URLSearchParams({
    secret: process.env.TURNSTILE_SECRET_KEY ?? "",
    response: token,
  });
  try {
    const res = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      { method: "POST", body, cache: "no-store" },
    );
    const data = (await res.json()) as { success: boolean };
    return data.success === true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// getAvailableSlotsAction
// ---------------------------------------------------------------------------

export type SlotResult = { startsAt: string; endsAt: string };

export async function getAvailableSlotsAction(input: {
  clinicId: string;
  professionalId: string;
  serviceId: string;
  /** Data no formato "YYYY-MM-DD" (hora local da clínica). */
  dateLocal: string;
  timezone: string;
}): Promise<SlotResult[]> {
  // Valida profissional pertence à clínica e está ativo.
  const [pro] = await db
    .select({ id: professionals.id })
    .from(professionals)
    .where(
      and(
        eq(professionals.id, input.professionalId),
        eq(professionals.clinicId, input.clinicId),
        eq(professionals.active, true),
      ),
    )
    .limit(1);
  if (!pro) return [];

  // Busca duração do serviço.
  const [svc] = await db
    .select({ durationMinutes: services.durationMinutes })
    .from(services)
    .where(
      and(
        eq(services.id, input.serviceId),
        eq(services.clinicId, input.clinicId),
        eq(services.active, true),
      ),
    )
    .limit(1);
  if (!svc) return [];

  // Range: só o dia selecionado (to = dia seguinte, exclusivo).
  const { dateLocal, timezone } = input;
  const nextDay = (() => {
    const d = new Date(`${dateLocal}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + 1);
    return d.toISOString().slice(0, 10);
  })();

  // Busca em paralelo: faixas semanais, overrides e bookings do dia.
  const [weeklyAvail, overrides, bookings] = await Promise.all([
    db
      .select()
      .from(weeklyAvailability)
      .where(eq(weeklyAvailability.professionalId, input.professionalId)),
    listOverridesAffectingProfessional(input.professionalId, input.clinicId),
    // Range generoso em UTC para cobrir o dia completo em qualquer fuso.
    getConfirmedBookingsInRange(
      input.professionalId,
      new Date(`${dateLocal}T00:00:00Z`),
      new Date(`${nextDay}T06:00:00Z`),
    ),
  ]);

  const slots = generateSlots({
    durationMinutes: svc.durationMinutes,
    weeklyAvailability: weeklyAvail.map((w) => ({
      weekday: w.weekday,
      startTime: w.startTime,
      endTime: w.endTime,
    })),
    overrides: overrides.map((o) => ({
      startsAt: o.startsAt,
      endsAt: o.endsAt,
    })),
    bookings: bookings.map((b) => ({
      startsAt: b.startsAt,
      endsAt: b.endsAt,
    })),
    fromDateLocal: dateLocal,
    toDateLocal: nextDay,
    timezone,
  });

  return slots.map((s) => ({
    startsAt: s.start.toISOString(),
    endsAt: s.end.toISOString(),
  }));
}

// ---------------------------------------------------------------------------
// createBookingAction
// ---------------------------------------------------------------------------

const BookingSchema = z.object({
  clinicSlug: z.string().min(1),
  professionalId: z.string().uuid(),
  serviceId: z.string().uuid(),
  /** ISO UTC, ex.: "2026-06-15T12:00:00.000Z" */
  startsAt: z.string().datetime(),
  patientName: z
    .string()
    .trim()
    .min(2, "Nome muito curto")
    .max(100, "Nome muito longo"),
  patientPhone: z
    .string()
    .trim()
    .min(8, "Telefone inválido")
    .max(20, "Telefone inválido"),
  patientEmail: z.string().trim().email("E-mail inválido"),
  turnstileToken: z.string().min(1),
});

export type CreateBookingInput = z.infer<typeof BookingSchema>;

export type BookingActionResult =
  | { ok: true; cancelToken: string }
  | { ok: false; error: string };

export async function createBookingAction(
  input: CreateBookingInput,
): Promise<BookingActionResult> {
  // 1. Validação de schema.
  const parsed = BookingSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Dados inválidos. Verifique os campos e tente novamente.",
    };
  }
  const data = parsed.data;

  // 2. Verifica Turnstile.
  const turnstileOk = await verifyTurnstile(data.turnstileToken);
  if (!turnstileOk) {
    return {
      ok: false,
      error: "Verificação de segurança falhou. Tente novamente.",
    };
  }

  // 3. Busca clínica.
  const clinic = await getClinicBySlug(data.clinicSlug);
  if (!clinic) return { ok: false, error: "Clínica não encontrada." };

  // 4. Valida serviço.
  const [svc] = await db
    .select({ id: services.id, durationMinutes: services.durationMinutes })
    .from(services)
    .where(
      and(
        eq(services.id, data.serviceId),
        eq(services.clinicId, clinic.id),
        eq(services.active, true),
      ),
    )
    .limit(1);
  if (!svc) return { ok: false, error: "Serviço não encontrado ou inativo." };

  // 5. Valida profissional.
  const [pro] = await db
    .select({ id: professionals.id })
    .from(professionals)
    .where(
      and(
        eq(professionals.id, data.professionalId),
        eq(professionals.clinicId, clinic.id),
        eq(professionals.active, true),
      ),
    )
    .limit(1);
  if (!pro)
    return { ok: false, error: "Profissional não encontrado ou inativo." };

  // 6. Valida vínculo profissional → serviço.
  const [link] = await db
    .select({ serviceId: professionalServices.serviceId })
    .from(professionalServices)
    .where(
      and(
        eq(professionalServices.professionalId, data.professionalId),
        eq(professionalServices.serviceId, data.serviceId),
      ),
    )
    .limit(1);
  if (!link)
    return {
      ok: false,
      error: "Este profissional não atende este serviço.",
    };

  // 7. Calcula horário de fim.
  const startsAt = new Date(data.startsAt);
  const endsAt = new Date(
    startsAt.getTime() + svc.durationMinutes * 60_000,
  );

  // 8. Insere booking — captura violação do unique partial index (23505).
  try {
    const booking = await createBooking({
      clinicId: clinic.id,
      professionalId: data.professionalId,
      serviceId: data.serviceId,
      patientName: data.patientName,
      patientPhone: data.patientPhone,
      patientEmail: data.patientEmail.toLowerCase(),
      startsAt,
      endsAt,
    });

    // 9. Dispara emails em background (não bloqueia a resposta).
    after(async () => {
      const details = await getBookingByToken(booking.cancelToken);
      if (!details) return;

      // Confirmação ao paciente (com .ics anexo)
      await sendBookingConfirmation({
        patientEmail: details.patientEmail,
        patientName: details.patientName,
        clinicName: clinic.name,
        clinicSlug: clinic.slug,
        clinicAddress: clinic.address,
        serviceName: details.service.name,
        professionalName: details.professional.name,
        startsAt: details.startsAt,
        endsAt: details.endsAt,
        durationMinutes: details.service.durationMinutes,
        bookingId: details.id,
        cancelToken: details.cancelToken,
      });

      // Notificação ao staff (se a clínica tem email de contato)
      if (clinic.contactEmail) {
        await sendStaffNotification({
          staffEmail: clinic.contactEmail,
          kind: "new",
          clinicName: clinic.name,
          patientName: details.patientName,
          patientEmail: details.patientEmail,
          patientPhone: details.patientPhone,
          serviceName: details.service.name,
          professionalName: details.professional.name,
          startsAt: details.startsAt,
        });
      }
    });

    return { ok: true, cancelToken: booking.cancelToken };
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
          "Este horário acabou de ser reservado por outra pessoa. Escolha outro horário.",
      };
    }
    console.error("[createBookingAction]", err);
    return {
      ok: false,
      error: "Erro ao salvar o agendamento. Tente novamente.",
    };
  }
}
