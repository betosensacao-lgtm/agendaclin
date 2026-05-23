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
import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  inArray,
  lt,
  lte,
  or,
} from "drizzle-orm";

import { db } from "@/lib/db";
import {
  bookings,
  professionals,
  services,
  type Booking,
  type NewBooking,
} from "@/lib/db/schema";

// ---- Status do booking (re-export do enum) ----

export const BOOKING_STATUSES = [
  "confirmed",
  "cancelled",
  "attended",
  "no_show",
] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

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
 * Remarca um booking pelo cancel_token (mantém o mesmo id e token).
 *
 * Lança erro com code "23505" se o novo slot conflita com outro booking
 * confirmado do mesmo profissional (unique partial index).
 *
 * Lança erro genérico se booking não existir, não pertencer à clínica,
 * ou não estiver "confirmed".
 */
export async function rescheduleBookingByToken(input: {
  cancelToken: string;
  clinicId: string;
  newStartsAt: Date;
  newEndsAt: Date;
}): Promise<boolean> {
  const result = await db
    .update(bookings)
    .set({
      startsAt: input.newStartsAt,
      endsAt: input.newEndsAt,
    })
    .where(
      and(
        eq(bookings.cancelToken, input.cancelToken),
        eq(bookings.clinicId, input.clinicId),
        eq(bookings.status, "confirmed"),
      ),
    )
    .returning({ id: bookings.id });

  return result.length > 0;
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

// ---------------------------------------------------------------------------
// Queries para o painel admin (F4) e do profissional (F5)
// ---------------------------------------------------------------------------

/**
 * Item da agenda — bookings + nome do profissional/serviço (join leve).
 * Usado nas telas /agenda e /consultas.
 */
export type AgendaItem = {
  id: string;
  startsAt: Date;
  endsAt: Date;
  status: BookingStatus;
  patientName: string;
  patientPhone: string;
  patientEmail: string;
  professional: { id: string; name: string };
  service: { id: string; name: string; durationMinutes: number };
};

/**
 * Lista bookings de uma clínica em um intervalo [from, to) (em UTC),
 * ordenados por horário. Aceita filtros opcionais por profissional e por
 * status (lista de status — se vazia, retorna todos).
 *
 * Inclui join com professionals e services.
 */
export async function listBookingsInRange(input: {
  clinicId: string;
  from: Date;
  to: Date;
  professionalId?: string | null;
  statuses?: BookingStatus[];
}): Promise<AgendaItem[]> {
  const { clinicId, from, to, professionalId, statuses } = input;

  const whereClauses = [
    eq(bookings.clinicId, clinicId),
    gte(bookings.startsAt, from),
    lt(bookings.startsAt, to),
  ];
  if (professionalId) {
    whereClauses.push(eq(bookings.professionalId, professionalId));
  }
  if (statuses && statuses.length > 0) {
    whereClauses.push(inArray(bookings.status, statuses));
  }

  const rows = await db
    .select({
      id: bookings.id,
      startsAt: bookings.startsAt,
      endsAt: bookings.endsAt,
      status: bookings.status,
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
    .where(and(...whereClauses))
    .orderBy(asc(bookings.startsAt));

  return rows.map((r) => ({
    id: r.id,
    startsAt: r.startsAt,
    endsAt: r.endsAt,
    status: r.status,
    patientName: r.patientName,
    patientPhone: r.patientPhone,
    patientEmail: r.patientEmail,
    professional: { id: r.professionalId, name: r.professionalName },
    service: {
      id: r.serviceId,
      name: r.serviceName,
      durationMinutes: r.serviceDuration,
    },
  }));
}

/**
 * Lista paginada de bookings de uma clínica para a tela /consultas.
 * Ordenado por startsAt DESC (mais recentes primeiro). Aceita filtros opcionais.
 */
export async function listBookingsPaginated(input: {
  clinicId: string;
  page: number; // 1-indexed
  pageSize: number;
  professionalId?: string | null;
  statuses?: BookingStatus[];
}): Promise<{ rows: AgendaItem[]; total: number }> {
  const { clinicId, page, pageSize, professionalId, statuses } = input;

  const whereClauses = [eq(bookings.clinicId, clinicId)];
  if (professionalId) {
    whereClauses.push(eq(bookings.professionalId, professionalId));
  }
  if (statuses && statuses.length > 0) {
    whereClauses.push(inArray(bookings.status, statuses));
  }
  const whereExpr = and(...whereClauses);

  const offset = Math.max(0, (page - 1) * pageSize);

  const [rows, [{ value: total }]] = await Promise.all([
    db
      .select({
        id: bookings.id,
        startsAt: bookings.startsAt,
        endsAt: bookings.endsAt,
        status: bookings.status,
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
      .where(whereExpr)
      .orderBy(desc(bookings.startsAt))
      .limit(pageSize)
      .offset(offset),
    db
      .select({ value: count() })
      .from(bookings)
      .where(whereExpr),
  ]);

  return {
    rows: rows.map((r) => ({
      id: r.id,
      startsAt: r.startsAt,
      endsAt: r.endsAt,
      status: r.status,
      patientName: r.patientName,
      patientPhone: r.patientPhone,
      patientEmail: r.patientEmail,
      professional: { id: r.professionalId, name: r.professionalName },
      service: {
        id: r.serviceId,
        name: r.serviceName,
        durationMinutes: r.serviceDuration,
      },
    })),
    total,
  };
}

/**
 * Atualiza o status de um booking. Escopado por clinicId pra segurança.
 * Retorna o booking atualizado ou null se não encontrou.
 */
export async function updateBookingStatus(input: {
  bookingId: string;
  clinicId: string;
  newStatus: BookingStatus;
}): Promise<Booking | null> {
  const rows = await db
    .update(bookings)
    .set({ status: input.newStatus })
    .where(
      and(
        eq(bookings.id, input.bookingId),
        eq(bookings.clinicId, input.clinicId),
      ),
    )
    .returning();

  return rows[0] ?? null;
}
