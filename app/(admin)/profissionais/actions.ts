/**
 * Server Actions do CRUD de profissionais.
 *
 *   saveProfessionalAction         cria/edita + sincroniza serviços N:N
 *   toggleProfessionalActiveAction alterna o flag `active`
 *   createProfessionalLoginAction  cria conta no Supabase Auth + vincula
 *
 * Os IDs de serviço submetidos são re-validados contra os serviços da
 * própria clínica — defesa contra forjar IDs de outras clínicas via
 * inspect do form.
 */
"use server";

import { randomBytes } from "node:crypto";

import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createSupabaseAdminClient } from "@/lib/auth/admin";
import { requireRole } from "@/lib/auth/guards";
import { withTenant } from "@/lib/db/tenant";
import {
  createProfessional,
  getProfessionalById,
  syncProfessionalServices,
  updateProfessional,
} from "@/lib/db/queries/professionals";
import { professionals, services, users } from "@/lib/db/schema";

// -----------------------------------------------------------------------
// saveProfessionalAction (cria/edita)
// -----------------------------------------------------------------------

const ProfessionalSchema = z.object({
  id: z.uuid().optional(),
  name: z
    .string()
    .trim()
    .min(2, "Nome deve ter no mínimo 2 caracteres")
    .max(100, "Nome muito longo"),
  serviceIds: z.array(z.uuid("ID de serviço inválido")),
});

export type ProfessionalFormState = {
  fieldErrors?: Partial<Record<"name" | "serviceIds", string>>;
  error?: string;
  ok?: boolean;
};

export async function saveProfessionalAction(
  _prevState: ProfessionalFormState,
  formData: FormData,
): Promise<ProfessionalFormState> {
  const user = await requireRole("admin");

  const serviceIds = formData
    .getAll("serviceIds")
    .map((v) => String(v))
    .filter(Boolean);

  const parsed = ProfessionalSchema.safeParse({
    id: formData.get("id") || undefined,
    name: formData.get("name"),
    serviceIds,
  });

  if (!parsed.success) {
    const fieldErrors: ProfessionalFormState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const root = issue.path[0] as keyof NonNullable<
        ProfessionalFormState["fieldErrors"]
      >;
      if (!fieldErrors[root]) fieldErrors[root] = issue.message;
    }
    return { fieldErrors };
  }

  try {
    const result = await withTenant(user.clinicId, async (tx) => {
      // Defesa: garante que todos os service_ids pertencem à clínica do user.
      if (parsed.data.serviceIds.length > 0) {
        const owned = await tx
          .select({ id: services.id })
          .from(services)
          .where(
            and(
              eq(services.clinicId, user.clinicId),
              inArray(services.id, parsed.data.serviceIds),
            ),
          );

        if (owned.length !== parsed.data.serviceIds.length) {
          return "invalid_services" as const;
        }
      }

      let professionalId: string;

      if (parsed.data.id) {
        const updated = await updateProfessional(tx, parsed.data.id, user.clinicId, {
          name: parsed.data.name,
        });
        if (!updated) {
          return "not_found" as const;
        }
        professionalId = updated.id;
      } else {
        const created = await createProfessional(tx, {
          clinicId: user.clinicId,
          name: parsed.data.name,
        });
        professionalId = created.id;
      }

      await syncProfessionalServices(tx, professionalId, parsed.data.serviceIds);
      return "ok" as const;
    });

    if (result === "invalid_services") {
      return {
        fieldErrors: { serviceIds: "Algum serviço selecionado é inválido" },
      };
    }
    if (result === "not_found") {
      return { error: "Profissional não encontrado" };
    }
  } catch (err) {
    console.error("[saveProfessionalAction]", err);
    return { error: "Não foi possível salvar. Tente novamente." };
  }

  revalidatePath("/profissionais");
  return { ok: true };
}

export async function toggleProfessionalActiveAction(
  id: string,
  active: boolean,
): Promise<void> {
  const user = await requireRole("admin");
  await withTenant(user.clinicId, (tx) =>
    updateProfessional(tx, id, user.clinicId, { active }),
  );
  revalidatePath("/profissionais");
}

// -----------------------------------------------------------------------
// createProfessionalLoginAction (cria conta + vincula)
// -----------------------------------------------------------------------

const LoginSchema = z.object({
  professionalId: z.uuid(),
  email: z.email("E-mail inválido").transform((e) => e.toLowerCase()),
});

export type ProfessionalLoginResult =
  | { ok: true; email: string; temporaryPassword: string }
  | { ok: false; error: string };

/**
 * Cria uma conta de login (role=professional) e vincula ao profissional.
 * Gera senha temporária aleatória e retorna pro admin compartilhar.
 *
 * Erros tratados:
 *   - profissional não pertence à clínica do admin
 *   - profissional já tem userId vinculado
 *   - e-mail já está em uso no Supabase Auth (mesmo de outra clínica)
 */
export async function createProfessionalLoginAction(input: {
  professionalId: string;
  email: string;
}): Promise<ProfessionalLoginResult> {
  const admin = await requireRole("admin");

  const parsed = LoginSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const pro = await withTenant(admin.clinicId, (tx) =>
    getProfessionalById(tx, parsed.data.professionalId, admin.clinicId),
  );
  if (!pro) {
    return { ok: false, error: "Profissional não encontrado" };
  }
  if (pro.userId) {
    return {
      ok: false,
      error: "Este profissional já tem uma conta de login vinculada.",
    };
  }

  const supa = createSupabaseAdminClient();

  // Verifica se já existe um auth user com esse e-mail (qualquer clínica).
  const { data: list, error: listErr } = await supa.auth.admin.listUsers({
    perPage: 200,
  });
  if (listErr) {
    console.error("[createProfessionalLoginAction] listUsers", listErr);
    return { ok: false, error: "Erro ao verificar e-mail existente." };
  }
  if (list.users.some((u) => u.email?.toLowerCase() === parsed.data.email)) {
    return {
      ok: false,
      error: "Este e-mail já está cadastrado no sistema.",
    };
  }

  const temporaryPassword = randomBytes(9).toString("base64url"); // ~12 chars

  // Cria o auth user.
  const { data: created, error: createErr } = await supa.auth.admin.createUser({
    email: parsed.data.email,
    password: temporaryPassword,
    email_confirm: true,
    user_metadata: { name: pro.name },
  });
  if (createErr || !created.user) {
    console.error("[createProfessionalLoginAction] createUser", createErr);
    return { ok: false, error: "Não foi possível criar a conta de login." };
  }

  const authUserId = created.user.id;

  // Insere row em public.users + vincula ao professional, em transação
  // tenant-scoped (não é bootstrap — a clínica já existe).
  try {
    await withTenant(admin.clinicId, async (tx) => {
      await tx.insert(users).values({
        id: authUserId,
        clinicId: admin.clinicId,
        role: "professional",
        name: pro.name,
        email: parsed.data.email,
      });
      await tx
        .update(professionals)
        .set({ userId: authUserId })
        .where(eq(professionals.id, pro.id));
    });
  } catch (err) {
    // Rollback do auth user pra não ficar zumbi.
    console.error("[createProfessionalLoginAction] tx falhou, rollback auth", err);
    await supa.auth.admin.deleteUser(authUserId).catch(() => {});
    return { ok: false, error: "Erro ao vincular conta. Tente novamente." };
  }

  revalidatePath("/profissionais");
  return {
    ok: true,
    email: parsed.data.email,
    temporaryPassword,
  };
}
