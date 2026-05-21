/**
 * Endpoint POST /logout — desloga e redireciona pra /login.
 * Forma como route handler (e não Server Action) pra permitir form simples
 * com action="/logout" sem JS.
 */
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/auth/server";

export async function POST() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}
