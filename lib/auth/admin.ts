/**
 * Cliente Supabase com service-role key — uso server-side EXCLUSIVO.
 * Permite operações administrativas: criar/atualizar/excluir usuários,
 * bypass de RLS, etc.
 *
 * NUNCA expor a service-role key no client.
 */
import { createClient } from "@supabase/supabase-js";

let cachedAdmin: ReturnType<typeof createClient> | null = null;

export function createSupabaseAdminClient() {
  if (cachedAdmin) return cachedAdmin;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórias",
    );
  }

  cachedAdmin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return cachedAdmin;
}
