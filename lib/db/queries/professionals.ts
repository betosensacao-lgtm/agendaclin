/**
 * Queries de `professionals`. Como cada profissional tem N:N com
 * services (via `professional_services`), exportamos um tipo
 * "rico" `ProfessionalWithServices` que carrega os serviços já
 * agrupados — pra evitar N+1 na UI.
 *
 * Tenant RLS: toda função recebe `tx` de withTenant(clinicId, ...) —
 * ver lib/db/tenant.ts e drizzle/migrations/0002_real_tenant_rls.sql.
 */
import { and, asc, desc, eq, inArray } from "drizzle-orm";

import type { Transaction } from "@/lib/db/types";
import {
  professionalServices,
  professionals,
  services,
  type NewProfessional,
  type Professional,
  type Service,
} from "@/lib/db/schema";

export type ProfessionalWithServices = Professional & {
  services: Pick<Service, "id" | "name" | "active">[];
};

export async function listProfessionalsByClinic(
  tx: Transaction,
  clinicId: string,
): Promise<ProfessionalWithServices[]> {
  const pros = await tx
    .select()
    .from(professionals)
    .where(eq(professionals.clinicId, clinicId))
    .orderBy(desc(professionals.active), asc(professionals.name));

  if (pros.length === 0) return [];

  const ids = pros.map((p) => p.id);

  const links = await tx
    .select({
      professionalId: professionalServices.professionalId,
      service: {
        id: services.id,
        name: services.name,
        active: services.active,
      },
    })
    .from(professionalServices)
    .innerJoin(services, eq(services.id, professionalServices.serviceId))
    .where(inArray(professionalServices.professionalId, ids));

  const byPro = new Map<string, ProfessionalWithServices["services"]>();
  for (const link of links) {
    const arr = byPro.get(link.professionalId) ?? [];
    arr.push(link.service);
    byPro.set(link.professionalId, arr);
  }

  return pros.map((p) => ({
    ...p,
    services: (byPro.get(p.id) ?? []).sort((a, b) =>
      a.name.localeCompare(b.name, "pt-BR"),
    ),
  }));
}

/**
 * Busca o profissional vinculado a um determinado user_id (usado pela
 * tela /minha-agenda pra descobrir qual profissional o usuário logado
 * representa). Retorna null se o user não está vinculado a nenhum pro.
 */
export async function getProfessionalByUserId(
  tx: Transaction,
  userId: string,
  clinicId: string,
): Promise<Professional | null> {
  const [pro] = await tx
    .select()
    .from(professionals)
    .where(
      and(
        eq(professionals.userId, userId),
        eq(professionals.clinicId, clinicId),
      ),
    )
    .limit(1);
  return pro ?? null;
}

export async function getProfessionalById(
  tx: Transaction,
  id: string,
  clinicId: string,
): Promise<ProfessionalWithServices | null> {
  const [pro] = await tx
    .select()
    .from(professionals)
    .where(and(eq(professionals.id, id), eq(professionals.clinicId, clinicId)))
    .limit(1);

  if (!pro) return null;

  const linked = await tx
    .select({
      id: services.id,
      name: services.name,
      active: services.active,
    })
    .from(professionalServices)
    .innerJoin(services, eq(services.id, professionalServices.serviceId))
    .where(eq(professionalServices.professionalId, pro.id));

  return {
    ...pro,
    services: linked.sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
  };
}

export async function createProfessional(
  tx: Transaction,
  input: NewProfessional,
): Promise<Professional> {
  const [p] = await tx.insert(professionals).values(input).returning();
  return p;
}

export async function updateProfessional(
  tx: Transaction,
  id: string,
  clinicId: string,
  patch: Partial<Pick<NewProfessional, "name" | "active" | "userId">>,
): Promise<Professional | null> {
  const [p] = await tx
    .update(professionals)
    .set(patch)
    .where(and(eq(professionals.id, id), eq(professionals.clinicId, clinicId)))
    .returning();
  return p ?? null;
}

/**
 * Sincroniza os serviços vinculados a um profissional — apaga todos os
 * links existentes e insere os novos. `serviceIds` esperado já validado
 * (não verifica clinic). Roda dentro do MESMO `tx` do caller (não abre
 * uma segunda transação) pra manter tudo atômico dentro do
 * withTenant(...) que já envolve a chamada.
 */
export async function syncProfessionalServices(
  tx: Transaction,
  professionalId: string,
  serviceIds: string[],
): Promise<void> {
  await tx
    .delete(professionalServices)
    .where(eq(professionalServices.professionalId, professionalId));

  if (serviceIds.length > 0) {
    await tx.insert(professionalServices).values(
      serviceIds.map((sid) => ({
        professionalId,
        serviceId: sid,
      })),
    );
  }
}
