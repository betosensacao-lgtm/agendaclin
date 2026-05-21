/**
 * Página raiz — redireciona conforme o estado de autenticação:
 *   - sem sessão        → /login
 *   - admin             → /agenda
 *   - professional      → /minha-agenda
 *
 * Página pública da clínica fica em /[slug] (vem em F3).
 */
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/guards";

export default async function Home() {
  const user = await getCurrentUser();

  if (!user) redirect("/login");
  if (user.role === "admin") redirect("/agenda");
  if (user.role === "professional") redirect("/minha-agenda");

  // Fallback inesperado
  redirect("/login");
}
