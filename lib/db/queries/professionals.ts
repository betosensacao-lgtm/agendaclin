/**
 * Queries de `professionals`. Como cada profissional tem N:N com
 * services (via `professional_services`), exportamos um tipo
 * "rico" `ProfessionalWithServices` que carrega os serviços já
 * agrupados — pra evitar N+1 na UI.
 */
import { and, asc, desc, eq, inArray } from "drizzle-orm";

import { db } from "@/lib/db";
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
  clinicId: string,
): Promise<ProfessionalWithServices[]> {
  const pros = await db
    .select()
    .from(professionals)
    .where(eq(professionals.clinicId, clinicId))
    .orderBy(desc(professionals.active), asc(professionals.name));

  if (pros.length === 0) return [];

  const ids = pros.map((p) => p.id);

  const links = await db
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
  userId: string,
  clinicId: string,
): Promise<Professional | null> {
  const [pro] = await db
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
  id: string,
  clinicId: string,
): Promise<ProfessionalWithServices | null> {
  const [pro] = await db
    .select()
    .from(professionals)
    .where(and(eq(professionals.id, id), eq(professionals.clinicId, clinicId)))
    .limit(1);

  if (!pro) return null;

  const linked = await db
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
  input: NewProfessional,
): Promise<Professional> {
  const [p] = await db.insert(professionals).values(input).returning();
  return p;
}

export async function updateProfessional(
  id: string,
  clinicId: string,
  patch: Partial<Pick<NewProfessional, "name" | "active" | "userId">>,
): Promise<Professional | null> {
  const [p] = await db
    .update(professionals)
    .set(patch)
    .where(and(eq(professionals.id, id), eq(professionals.clinicId, clinicId)))
    .returning();
  return p ?? null;
}

/**
 * Sincroniza os serviços vinculados a um profissional — apaga todos os
 * links existentes e insere os novos. Roda em transação pra garantir
 * consistência. `serviceIds` esperado já validado (não verifica clinic).
 */
export async function syncProfessionalServices(
  professionalId: string,
  serviceIds: string[],
): Promise<void> {
  await db.transaction(async (tx) => {
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
  });
}
