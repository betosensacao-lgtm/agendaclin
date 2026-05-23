/**
 * Server Actions do cadastro self-service de clínicas.
 *
 *   checkSlugAvailabilityAction  validação inline do slug
 *   signUpClinicAction           cria clinic + auth user + public.users
 *                                + dispara email de boas-vindas
 *
 * Segurança:
 *  - Turnstile obrigatório (anti-spam).
 *  - Slug é validado contra reservados + regex.
 *  - Se algo falha após criar o auth user, faz rollback (deleta o user
 *    pra não ficar zumbi no Supabase Auth).
 */
"use server";

import { eq } from "drizzle-orm";
import { after } from "next/server";
import { z } from "zod";

import { createSupabaseAdminClient } from "@/lib/auth/admin";
import { createSupabaseServerClient } from "@/lib/auth/server";
import { db } from "@/lib/db";
import {
  isReservedSlug,
  isSlugAvailable,
  SLUG_REGEX,
} from "@/lib/db/queries/clinics";
import { clinics, users } from "@/lib/db/schema";
import { sendWelcomeClinic } from "@/lib/email/send";

// ---------------------------------------------------------------------------
// Turnstile helper (mesma lógica do booking — duplicada pra não criar
// dependência circular; se virar 3 lugares, extrair pra lib/turnstile.ts)
// ---------------------------------------------------------------------------

async function verifyTurnstile(token: string): Promise<boolean> {
  const body = new URLSearchParams({
    secret: process.env.TURNSTILE_SECRET_KEY ?? "",
    response: token,
  });
  try {
    const res = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      { method: "POST", body, cache: "no-store" },
    );
    const data = (await res.json()) as { success: boolean };
    return data.success === true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// checkSlugAvailabilityAction (usado pelo form em onChange)
// ---------------------------------------------------------------------------

export type SlugCheckResult =
  | { ok: true; available: true }
  | { ok: true; available: false; reason: "format" | "reserved" | "taken" }
  | { ok: false; error: string };

export async function checkSlugAvailabilityAction(
  slug: string,
): Promise<SlugCheckResult> {
  const normalized = slug.toLowerCase().trim();

  if (!SLUG_REGEX.test(normalized)) {
    return { ok: true, available: false, reason: "format" };
  }
  if (isReservedSlug(normalized)) {
    return { ok: true, available: false, reason: "reserved" };
  }

  try {
    const available = await isSlugAvailable(normalized);
    return available
      ? { ok: true, available: true }
      : { ok: true, available: false, reason: "taken" };
  } catch (err) {
    console.error("[checkSlugAvailabilityAction]", err);
    return { ok: false, error: "Erro ao verificar disponibilidade." };
  }
}

// ---------------------------------------------------------------------------
// signUpClinicAction
// ---------------------------------------------------------------------------

const SignUpSchema = z.object({
  clinicName: z
    .string()
    .trim()
    .min(2, "Nome da clínica muito curto")
    .max(120, "Nome da clínica muito longo"),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(SLUG_REGEX, "Slug inválido — use 3-40 letras minúsculas, números e hífens"),
  adminName: z
    .string()
    .trim()
    .min(2, "Nome do admin muito curto")
    .max(120, "Nome do admin muito longo"),
  adminEmail: z.email("E-mail inválido").transform((e) => e.toLowerCase()),
  password: z
    .string()
    .min(8, "Senha deve ter no mínimo 8 caracteres")
    .max(72, "Senha muito longa"), // bcrypt limita em 72
  acceptTerms: z.literal("on", { message: "Você precisa aceitar os termos" }),
  turnstileToken: z.string().min(1, "Verificação de segurança obrigatória"),
});

export type SignUpFormState = {
  fieldErrors?: Partial<
    Record<
      | "clinicName"
      | "slug"
      | "adminName"
      | "adminEmail"
      | "password"
      | "acceptTerms"
      | "turnstileToken",
      string
    >
  >;
  error?: string;
  ok?: boolean;
  /** Slug salvo — usado pelo client pra redirecionar após login. */
  clinicSlug?: string;
};

export async function signUpClinicAction(
  _prev: SignUpFormState,
  formData: FormData,
): Promise<SignUpFormState> {
  // 1. Validação de schema.
  const parsed = SignUpSchema.safeParse({
    clinicName: formData.get("clinicName"),
    slug: formData.get("slug"),
    adminName: formData.get("adminName"),
    adminEmail: formData.get("adminEmail"),
    password: formData.get("password"),
    acceptTerms: formData.get("acceptTerms"),
    turnstileToken: formData.get("turnstileToken"),
  });

  if (!parsed.success) {
    const fieldErrors: SignUpFormState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const root = issue.path[0] as keyof NonNullable<
        SignUpFormState["fieldErrors"]
      >;
      if (!fieldErrors[root]) fieldErrors[root] = issue.message;
    }
    return { fieldErrors };
  }
  const data = parsed.data;

  // 2. Slug não pode ser reservado nem estar em uso.
  if (isReservedSlug(data.slug)) {
    return {
      fieldErrors: { slug: "Este slug é reservado — escolha outro" },
    };
  }
  const slugFree = await isSlugAvailable(data.slug);
  if (!slugFree) {
    return {
      fieldErrors: { slug: "Este slug já está em uso — escolha outro" },
    };
  }

  // 3. Turnstile.
  const turnstileOk = await verifyTurnstile(data.turnstileToken);
  if (!turnstileOk) {
    return {
      error: "Verificação de segurança falhou. Tente novamente.",
    };
  }

  // 4. Verifica se o e-mail admin já existe no Supabase Auth.
  const supaAdmin = createSupabaseAdminClient();
  const { data: list, error: listErr } = await supaAdmin.auth.admin.listUsers({
    perPage: 200,
  });
  if (listErr) {
    console.error("[signUpClinicAction] listUsers", listErr);
    return { error: "Erro ao verificar e-mail. Tente novamente." };
  }
  if (list.users.some((u) => u.email?.toLowerCase() === data.adminEmail)) {
    return {
      fieldErrors: {
        adminEmail: "Este e-mail já está cadastrado. Faça login.",
      },
    };
  }

  // 5. Cria auth user.
  const { data: created, error: createErr } = await supaAdmin.auth.admin.createUser({
    email: data.adminEmail,
    password: data.password,
    email_confirm: true,
    user_metadata: { name: data.adminName },
  });
  if (createErr || !created.user) {
    console.error("[signUpClinicAction] createUser", createErr);
    return { error: "Não foi possível criar a conta. Tente novamente." };
  }
  const authUserId = created.user.id;

  // 6. Cria clinic + users em transação. Rollback do auth user se falhar.
  let clinicId: string;
  try {
    clinicId = await db.transaction(async (tx) => {
      const [newClinic] = await tx
        .insert(clinics)
        .values({
          slug: data.slug,
          name: data.clinicName,
          contactEmail: data.adminEmail,
        })
        .returning({ id: clinics.id });

      await tx.insert(users).values({
        id: authUserId,
        clinicId: newClinic.id,
        role: "admin",
        name: data.adminName,
        email: data.adminEmail,
      });

      return newClinic.id;
    });
  } catch (err) {
    console.error("[signUpClinicAction] tx falhou, rollback auth", err);
    await supaAdmin.auth.admin.deleteUser(authUserId).catch(() => {});
    return { error: "Erro ao salvar dados. Tente novamente." };
  }

  // 7. Faz login na hora pra o usuário já entrar autenticado.
  const supa = await createSupabaseServerClient();
  const { error: signInErr } = await supa.auth.signInWithPassword({
    email: data.adminEmail,
    password: data.password,
  });
  if (signInErr) {
    // Conta foi criada com sucesso, só o login automático falhou.
    // O usuário pode logar manualmente em /login.
    console.error("[signUpClinicAction] auto-login falhou", signInErr);
  }

  // 8. Dispara email de boas-vindas em background (não bloqueia resposta).
  after(async () => {
    await sendWelcomeClinic({
      adminEmail: data.adminEmail,
      adminName: data.adminName,
      clinicName: data.clinicName,
      clinicSlug: data.slug,
    });
  });

  // 9. Limpa cache da lista pública (paranoia — provavelmente não tem)
  //    e retorna ok pro client redirecionar pra /onboarding.
  void clinicId; // pode usar pra log futuro
  return { ok: true, clinicSlug: data.slug };
}
