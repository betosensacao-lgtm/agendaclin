/**
 * Queries relacionadas à tabela `clinics` e dados públicos da clínica.
 */
import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  clinics,
  professionalServices,
  professionals,
  services,
} from "@/lib/db/schema";

/** Retorna clínica pelo slug público. null se não existir. */
export async function getClinicBySlug(slug: string) {
  const rows = await db
    .select()
    .from(clinics)
    .where(eq(clinics.slug, slug))
    .limit(1);
  return rows[0] ?? null;
}

/** Retorna serviços ativos de uma clínica para exibição pública. */
export async function getPublicServices(clinicId: string) {
  return db
    .select({
      id: services.id,
      name: services.name,
      durationMinutes: services.durationMinutes,
      priceCents: services.priceCents,
    })
    .from(services)
    .where(and(eq(services.clinicId, clinicId), eq(services.active, true)))
    .orderBy(services.name);
}

/**
 * Retorna profissionais ativos que atendem um determinado serviço.
 * Usado no step 2 do wizard (seleção de profissional).
 */
export async function getPublicProfessionalsByService(
  clinicId: string,
  serviceId: string,
) {
  return db
    .select({
      id: professionals.id,
      name: professionals.name,
    })
    .from(professionals)
    .innerJoin(
      professionalServices,
      eq(professionals.id, professionalServices.professionalId),
    )
    .where(
      and(
        eq(professionals.clinicId, clinicId),
        eq(professionals.active, true),
        eq(professionalServices.serviceId, serviceId),
      ),
    )
    .orderBy(professionals.name);
}
