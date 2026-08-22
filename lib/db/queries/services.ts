/**
 * Queries de `services`. Todas escopadas por clinic_id — preparação
 * multi-tenant: nenhum lookup ignora o tenant do usuário.
 *
 * Tenant RLS: toda função recebe `tx` de withTenant(clinicId, ...) —
 * ver lib/db/tenant.ts e drizzle/migrations/0002_real_tenant_rls.sql.
 */
import { and, asc, desc, eq } from "drizzle-orm";

import type { Transaction } from "@/lib/db/types";
import { services, type NewService, type Service } from "@/lib/db/schema";

export type ServiceUpdate = Partial<
  Pick<NewService, "name" | "durationMinutes" | "priceCents" | "active">
>;

export async function listServicesByClinic(
  tx: Transaction,
  clinicId: string,
): Promise<Service[]> {
  return tx
    .select()
    .from(services)
    .where(eq(services.clinicId, clinicId))
    .orderBy(desc(services.active), asc(services.name));
}

export async function getServiceById(
  tx: Transaction,
  id: string,
  clinicId: string,
): Promise<Service | null> {
  const [s] = await tx
    .select()
    .from(services)
    .where(and(eq(services.id, id), eq(services.clinicId, clinicId)))
    .limit(1);
  return s ?? null;
}

export async function createService(
  tx: Transaction,
  input: NewService,
): Promise<Service> {
  const [s] = await tx.insert(services).values(input).returning();
  return s;
}

export async function updateService(
  tx: Transaction,
  id: string,
  clinicId: string,
  patch: ServiceUpdate,
): Promise<Service | null> {
  const [s] = await tx
    .update(services)
    .set(patch)
    .where(and(eq(services.id, id), eq(services.clinicId, clinicId)))
    .returning();
  return s ?? null;
}
