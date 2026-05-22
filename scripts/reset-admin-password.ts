/**
 * Reseta a senha do admin gerada pelo seed. Útil quando você perdeu
 * o output original do `pnpm db:seed`.
 *
 * Rodar: pnpm dlx tsx scripts/reset-admin-password.ts
 *  ou:   pnpm tsx scripts/reset-admin-password.ts
 *
 * Variáveis opcionais (.env.local):
 *   SEED_ADMIN_EMAIL  default admin@agendaclin.local
 */
import "./_env";

import { randomBytes } from "node:crypto";

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = required("NEXT_PUBLIC_SUPABASE_URL");
const SUPABASE_SERVICE_KEY = required("SUPABASE_SERVICE_ROLE_KEY");

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? "admin@agendaclin.local";

function required(name: string): string {
  const v = process.env[name];
  if (!v) {
    console.error(`Variável ${name} não definida em .env.local`);
    process.exit(1);
  }
  return v;
}

async function main() {
  const supa = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: list, error: listErr } = await supa.auth.admin.listUsers({
    perPage: 200,
  });
  if (listErr) throw listErr;

  const user = list.users.find((u) => u.email === ADMIN_EMAIL);
  if (!user) {
    console.error(`✗ Usuário ${ADMIN_EMAIL} não existe no Supabase Auth.`);
    console.error("  Rode `pnpm db:seed` primeiro.");
    process.exit(1);
  }

  const newPassword = randomBytes(16).toString("base64url");

  const { error: updErr } = await supa.auth.admin.updateUserById(user.id, {
    password: newPassword,
  });
  if (updErr) throw updErr;

  console.log("\n────────── NOVA SENHA DO ADMIN ──────────");
  console.log(`  Email:  ${ADMIN_EMAIL}`);
  console.log(`  Senha:  ${newPassword}`);
  console.log("  Guarde no seu gerenciador de senhas agora.");
  console.log("─────────────────────────────────────────");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("✗ Reset falhou:");
    console.error(err);
    process.exit(1);
  });
