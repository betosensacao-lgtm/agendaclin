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

// ---------------------------------------------------------------------------
// Validação de slug
// ---------------------------------------------------------------------------

/**
 * Slugs reservados — nunca atribuir a clínica pra não colidir com rotas
 * da app, assets, ou nomes confusos no signup.
 *
 * Inclui rotas atuais e potenciais. Adicione antes de criar rota nova.
 */
const RESERVED_SLUGS = new Set<string>([
  // Rotas admin
  "agenda",
  "clinica",
  "consultas",
  "horarios",
  "profissionais",
  "servicos",
  // Rotas pro
  "minha-agenda",
  // Auth
  "login",
  "logout",
  "signup",
  "cadastro",
  "register",
  "esqueci-senha",
  "reset-password",
  // Sistema
  "api",
  "_next",
  "favicon.ico",
  "robots.txt",
  "sitemap.xml",
  "monitoring",
  "onboarding",
  // Reservas óbvias
  "admin",
  "app",
  "dashboard",
  "static",
  "public",
  "assets",
  "help",
  "support",
  "about",
  "terms",
  "privacy",
  "contact",
  "blog",
  "pricing",
  "billing",
  "settings",
  "account",
]);

/** Regra do formato do slug: 3-40 chars, lowercase, alfanumérico + hífen. */
export const SLUG_REGEX = /^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])?$/;

export function isReservedSlug(slug: string): boolean {
  return RESERVED_SLUGS.has(slug.toLowerCase());
}

/**
 * Checa se um slug está disponível pra cadastro:
 *   - formato válido
 *   - não está na lista de reservados
 *   - não está em uso em `clinics`
 */
export async function isSlugAvailable(slug: string): Promise<boolean> {
  if (!SLUG_REGEX.test(slug)) return false;
  if (isReservedSlug(slug)) return false;

  const [existing] = await db
    .select({ id: clinics.id })
    .from(clinics)
    .where(eq(clinics.slug, slug))
    .limit(1);

  return !existing;
}

/** Retorna clínica por ID. null se não existir. */
export async function getClinicById(id: string) {
  const rows = await db.select().from(clinics).where(eq(clinics.id, id)).limit(1);
  return rows[0] ?? null;
}

/**
 * Marca o onboarding como concluído. Idempotente.
 */
export async function markOnboardingCompleted(clinicId: string): Promise<void> {
  await db
    .update(clinics)
    .set({ onboardingCompleted: true })
    .where(eq(clinics.id, clinicId));
}

/**
 * Estado de cada passo do wizard de onboarding. Calculado a partir do
 * estado atual do banco — não precisa rastrear flags por etapa.
 */
export type OnboardingStatus = {
  clinicConfigured: boolean;
  hasService: boolean;
  hasProfessional: boolean;
  hasWeeklyAvailability: boolean;
  shared: boolean; // sempre true — passo "compartilhar" é manual
};

export async function getOnboardingStatus(
  clinicId: string,
): Promise<OnboardingStatus> {
  const [clinic] = await db
    .select({
      contactEmail: clinics.contactEmail,
      phone: clinics.phone,
      address: clinics.address,
    })
    .from(clinics)
    .where(eq(clinics.id, clinicId))
    .limit(1);

  const [hasService] = await db
    .select({ id: services.id })
    .from(services)
    .where(and(eq(services.clinicId, clinicId), eq(services.active, true)))
    .limit(1);

  const [hasPro] = await db
    .select({ id: professionals.id })
    .from(professionals)
    .where(
      and(
        eq(professionals.clinicId, clinicId),
        eq(professionals.active, true),
      ),
    )
    .limit(1);

  // Disponibilidade: pelo menos 1 faixa cadastrada em algum profissional
  // ativo. Faz join leve.
  const { weeklyAvailability } = await import("@/lib/db/schema");
  const [hasAvail] = await db
    .select({ id: weeklyAvailability.id })
    .from(weeklyAvailability)
    .innerJoin(
      professionals,
      eq(weeklyAvailability.professionalId, professionals.id),
    )
    .where(
      and(
        eq(professionals.clinicId, clinicId),
        eq(professionals.active, true),
      ),
    )
    .limit(1);

  return {
    clinicConfigured: Boolean(
      clinic?.contactEmail || clinic?.phone || clinic?.address,
    ),
    hasService: Boolean(hasService),
    hasProfessional: Boolean(hasPro),
    hasWeeklyAvailability: Boolean(hasAvail),
    shared: true,
  };
}

/**
 * Atualiza dados editáveis da clínica. Tudo opcional — só atualiza os
 * campos passados. Escopado por id (admin já valida ownership via session).
 */
export async function updateClinicFields(
  id: string,
  patch: {
    name?: string;
    contactEmail?: string | null;
    phone?: string | null;
    address?: string | null;
    hoursText?: string | null;
    logoUrl?: string | null;
  },
) {
  const [updated] = await db
    .update(clinics)
    .set(patch)
    .where(eq(clinics.id, id))
    .returning();
  return updated ?? null;
}

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
