/**
 * Helpers de autorização para Server Components / Server Actions.
 *
 *   getCurrentUser()   → null se anônimo; senão { id, clinicId, role, ... }
 *   requireUser()      → redireciona para /login se anônimo
 *   requireRole(role)  → redireciona para /login se não autenticado / role errado
 *
 * Nota: estes helpers fazem 2 consultas: auth.getUser() (Supabase) +
 * SELECT em public.users (Drizzle). A row em public.users é criada pelo
 * seed ou pelo onboarding — se faltar, getCurrentUser retorna null.
 */
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import { users, type User } from "@/lib/db/schema";

import { createSupabaseServerClient } from "./server";

export type Role = "admin" | "professional";

export type AuthenticatedUser = User & { authEmail: string };

export async function getCurrentUser(): Promise<AuthenticatedUser | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const [profile] = await db
    .select()
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1);

  if (!profile) return null;

  return { ...profile, authEmail: user.email ?? profile.email };
}

export async function requireUser(): Promise<AuthenticatedUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireRole(role: Role): Promise<AuthenticatedUser> {
  const user = await requireUser();
  if (user.role !== role) redirect("/login?error=forbidden");
  return user;
}
