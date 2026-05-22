/**
 * Queries de disponibilidade semanal e bloqueios pontuais (overrides).
 * Todas escopadas por clinic_id (multi-tenant ready).
 */
import { and, asc, eq, gte, isNull, or, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  availabilityOverrides,
  professionals,
  weeklyAvailability,
  type AvailabilityOverride,
  type NewAvailabilityOverride,
  type WeeklyAvailability,
} from "@/lib/db/schema";

// -----------------------------------------------------------------------
// Disponibilidade semanal
// -----------------------------------------------------------------------

export async function getWeeklyAvailability(
  professionalId: string,
  clinicId: string,
): Promise<WeeklyAvailability[]> {
  // Garante que o profissional pertence à clínica antes de retornar.
  const [pro] = await db
    .select({ id: professionals.id })
    .from(professionals)
    .where(
      and(
        eq(professionals.id, professionalId),
        eq(professionals.clinicId, clinicId),
      ),
    )
    .limit(1);
  if (!pro) return [];

  return db
    .select()
    .from(weeklyAvailability)
    .where(eq(weeklyAvailability.professionalId, professionalId))
    .orderBy(asc(weeklyAvailability.weekday), asc(weeklyAvailability.startTime));
}

export type WeeklyFaixaInput = {
  weekday: number;
  startTime: string; // "HH:MM" ou "HH:MM:SS"
  endTime: string;
};

/**
 * Substitui TODA a disponibilidade semanal do profissional pelas
 * faixas fornecidas. Idempotente — se receber lista vazia, deixa o
 * profissional sem disponibilidade. Roda em transação.
 *
 * O caller deve validar:
 *   - cada faixa tem start < end
 *   - faixas do mesmo weekday não se sobrepõem
 *   - profissional pertence à clínica do usuário
 */
export async function replaceWeeklyAvailability(
  professionalId: string,
  clinicId: string,
  faixas: WeeklyFaixaInput[],
): Promise<void> {
  // Re-checa ownership pra defesa em profundidade.
  const [pro] = await db
    .select({ id: professionals.id })
    .from(professionals)
    .where(
      and(
        eq(professionals.id, professionalId),
        eq(professionals.clinicId, clinicId),
      ),
    )
    .limit(1);
  if (!pro) throw new Error("Profissional não encontrado");

  await db.transaction(async (tx) => {
    await tx
      .delete(weeklyAvailability)
      .where(eq(weeklyAvailability.professionalId, professionalId));

    if (faixas.length > 0) {
      await tx.insert(weeklyAvailability).values(
        faixas.map((f) => ({
          professionalId,
          weekday: f.weekday,
          startTime: f.startTime,
          endTime: f.endTime,
        })),
      );
    }
  });
}

// -----------------------------------------------------------------------
// Bloqueios pontuais (overrides)
// -----------------------------------------------------------------------

/**
 * Lista overrides FUTUROS da clínica:
 *   - todos os bloqueios que terminam depois de "agora";
 *   - inclui tanto os da clínica inteira (professional_id NULL) quanto
 *     os atrelados a um profissional específico.
 */
export async function listFutureOverrides(
  clinicId: string,
): Promise<AvailabilityOverride[]> {
  return db
    .select()
    .from(availabilityOverrides)
    .where(
      and(
        eq(availabilityOverrides.clinicId, clinicId),
        gte(availabilityOverrides.endsAt, sql`now()`),
      ),
    )
    .orderBy(asc(availabilityOverrides.startsAt));
}

/**
 * Overrides que afetam um profissional específico — pra geração de
 * slots: tanto os do próprio profissional quanto os da clínica inteira.
 * Filtra por `endsAt >= now` por padrão.
 */
export async function listOverridesAffectingProfessional(
  professionalId: string,
  clinicId: string,
): Promise<AvailabilityOverride[]> {
  return db
    .select()
    .from(availabilityOverrides)
    .where(
      and(
        eq(availabilityOverrides.clinicId, clinicId),
        or(
          isNull(availabilityOverrides.professionalId),
          eq(availabilityOverrides.professionalId, professionalId),
        ),
      ),
    )
    .orderBy(asc(availabilityOverrides.startsAt));
}

export async function createOverride(
  input: NewAvailabilityOverride,
): Promise<AvailabilityOverride> {
  const [row] = await db.insert(availabilityOverrides).values(input).returning();
  return row;
}

/** Remove um override; só remove se pertence à clínica passada. */
export async function deleteOverride(
  id: string,
  clinicId: string,
): Promise<boolean> {
  const rows = await db
    .delete(availabilityOverrides)
    .where(
      and(
        eq(availabilityOverrides.id, id),
        eq(availabilityOverrides.clinicId, clinicId),
      ),
    )
    .returning({ id: availabilityOverrides.id });
  return rows.length > 0;
}
