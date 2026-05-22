/**
 * Queries e mutações relacionadas à tabela `bookings`.
 *
 * Regras importantes:
 * - Todas as operações são escopadas por `clinic_id` — nunca expor dados
 *   de outra clínica.
 * - O anti-double-booking é garantido pelo unique partial index
 *   `uniq_confirmed_slot` (professional_id, starts_at) WHERE status='confirmed'.
 *   O INSERT vai lançar PostgresError code 23505 se houver conflito.
 */
import { and, eq, gte, lte, or } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  bookings,
  professionals,
  services,
  type NewBooking,
} from "@/lib/db/schema";

// ---- Tipos públicos ----

export type CreateBookingInput = {
  clinicId: string;
  professionalId: string;
  serviceId: string;
  patientName: string;
  patientPhone: string;
  patientEmail: string;
  startsAt: Date;
  endsAt: Date;
};

export type BookingWithDetails = {
  id: string;
  cancelToken: string;
  status: "confirmed" | "cancelled" | "attended" | "no_show";
  startsAt: Date;
  endsAt: Date;
  patientName: string;
  patientPhone: string;
  patientEmail: string;
  professional: { id: string; name: string };
  service: { id: string; name: string; durationMinutes: number };
};

// ---- Leitura ----

/**
 * Busca um booking pelo cancel_token. Retorna detalhes completos
 * (profissional + serviço) para exibir na página de confirmação/cancelamento.
 */
export async function getBookingByToken(
  cancelToken: string,
): Promise<BookingWithDetails | null> {
  const rows = await db
    .select({
      id: bookings.id,
      cancelToken: bookings.cancelToken,
      status: bookings.status,
      startsAt: bookings.startsAt,
      endsAt: bookings.endsAt,
      patientName: bookings.patientName,
      patientPhone: bookings.patientPhone,
      patientEmail: bookings.patientEmail,
      professionalId: bookings.professionalId,
      professionalName: professionals.name,
      serviceId: bookings.serviceId,
      serviceName: services.name,
      serviceDuration: services.durationMinutes,
    })
    .from(bookings)
    .innerJoin(professionals, eq(bookings.professionalId, professionals.id))
    .innerJoin(services, eq(bookings.serviceId, services.id))
    .where(eq(bookings.cancelToken, cancelToken))
    .limit(1);

  const row = rows[0];
  if (!row) return null;

  return {
    id: row.id,
    cancelToken: row.cancelToken,
    status: row.status,
    startsAt: row.startsAt,
    endsAt: row.endsAt,
    patientName: row.patientName,
    patientPhone: row.patientPhone,
    patientEmail: row.patientEmail,
    professional: { id: row.professionalId, name: row.professionalName },
    service: {
      id: row.serviceId,
      name: row.serviceName,
      durationMinutes: row.serviceDuration,
    },
  };
}

/**
 * Retorna bookings confirmados de um profissional que se sobrepõem ao intervalo
 * [from, to]. Usado por generateSlots para marcar slots ocupados.
 */
export async function getConfirmedBookingsInRange(
  professionalId: string,
  from: Date,
  to: Date,
): Promise<Array<{ startsAt: Date; endsAt: Date }>> {
  return db
    .select({ startsAt: bookings.startsAt, endsAt: bookings.endsAt })
    .from(bookings)
    .where(
      and(
        eq(bookings.professionalId, professionalId),
        eq(bookings.status, "confirmed"),
        // Qualquer booking que se sobreponha ao range [from, to]
        or(
          and(gte(bookings.startsAt, from), lte(bookings.startsAt, to)),
          and(gte(bookings.endsAt, from), lte(bookings.endsAt, to)),
          and(lte(bookings.startsAt, from), gte(bookings.endsAt, to)),
        ),
      ),
    );
}

// ---- Mutações ----

/**
 * Insere um novo booking. Lança erro com code "23505" se o slot já estiver
 * ocupado (violação do unique partial index). O chamador deve capturar e
 * retornar mensagem amigável ao paciente.
 */
export async function createBooking(
  input: CreateBookingInput,
): Promise<{ id: string; cancelToken: string }> {
  const values: NewBooking = {
    clinicId: input.clinicId,
    professionalId: input.professionalId,
    serviceId: input.serviceId,
    patientName: input.patientName,
    patientPhone: input.patientPhone,
    patientEmail: input.patientEmail,
    startsAt: input.startsAt,
    endsAt: input.endsAt,
    status: "confirmed",
  };

  const rows = await db
    .insert(bookings)
    .values(values)
    .returning({ id: bookings.id, cancelToken: bookings.cancelToken });

  return rows[0];
}

/**
 * Cancela um booking pelo cancel_token. Só cancela se estiver "confirmed"
 * e pertencer à clínica informada (segurança extra). Retorna true se cancelou.
 */
export async function cancelBookingByToken(
  cancelToken: string,
  clinicId: string,
): Promise<boolean> {
  const result = await db
    .update(bookings)
    .set({ status: "cancelled" })
    .where(
      and(
        eq(bookings.cancelToken, cancelToken),
        eq(bookings.clinicId, clinicId),
        eq(bookings.status, "confirmed"),
      ),
    )
    .returning({ id: bookings.id });

  return result.length > 0;
}
