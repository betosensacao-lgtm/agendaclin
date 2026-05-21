/**
 * Server Action de login. Valida o formulário com Zod, chama
 * signInWithPassword, busca o profile (role + clinic) e redireciona.
 *
 * Mensagens de erro são intencionalmente genéricas ("credenciais
 * inválidas") pra não expor se um email está ou não cadastrado.
 */
"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

const LoginSchema = z.object({
  email: z.string().trim().email("Email inválido"),
  password: z.string().min(6, "Senha precisa ter no mínimo 6 caracteres"),
});

export type LoginState = {
  error?: string;
};

export async function loginAction(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = LoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Dados inválidos",
    };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error || !data.user) {
    return { error: "Email ou senha incorretos" };
  }

  // Busca role no espelho public.users
  const [profile] = await db
    .select()
    .from(users)
    .where(eq(users.id, data.user.id))
    .limit(1);

  if (!profile) {
    // Usuário existe no Supabase Auth mas não tem profile vinculado.
    // Faz logout pra não ficar com sessão "órfã" e mostra erro.
    await supabase.auth.signOut();
    return {
      error: "Conta sem clínica vinculada. Contate o administrador.",
    };
  }

  if (profile.role === "admin") {
    redirect("/agenda");
  }
  if (profile.role === "professional") {
    redirect("/minha-agenda");
  }
  redirect("/");
}
