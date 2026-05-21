/**
 * Queries de `services`. Todas escopadas por clinic_id — preparação
 * multi-tenant: nenhum lookup ignora o tenant do usuário.
 */
import { and, asc, desc, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { services, type NewService, type Service } from "@/lib/db/schema";

export type ServiceUpdate = Partial<
  Pick<NewService, "name" | "durationMinutes" | "priceCents" | "active">
>;

export async function listServicesByClinic(clinicId: string): Promise<Service[]> {
  return db
    .select()
    .from(services)
    .where(eq(services.clinicId, clinicId))
    .orderBy(desc(services.active), asc(services.name));
}

export async function getServiceById(
  id: string,
  clinicId: string,
): Promise<Service | null> {
  const [s] = await db
    .select()
    .from(services)
    .where(and(eq(services.id, id), eq(services.clinicId, clinicId)))
    .limit(1);
  return s ?? null;
}

export async function createService(input: NewService): Promise<Service> {
  const [s] = await db.insert(services).values(input).returning();
  return s;
}

export async function updateService(
  id: string,
  clinicId: string,
  patch: ServiceUpdate,
): Promise<Service | null> {
  const [s] = await db
    .update(services)
    .set(patch)
    .where(and(eq(services.id, id), eq(services.clinicId, clinicId)))
    .returning();
  return s ?? null;
}
