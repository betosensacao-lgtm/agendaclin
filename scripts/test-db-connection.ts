/**
 * Script ad-hoc para diagnosticar conexão com o Postgres do Supabase.
 * Roda com: pnpm exec tsx scripts/test-db-connection.ts
 */
import "./_env"; // carrega .env.local ANTES dos outros imports

import postgres from "postgres";

async function main() {
  // Prefere DIRECT_URL (porta 5432) — mais robusto pra dev local.
  const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
  if (!url) {
    console.error("Nem DIRECT_URL nem DATABASE_URL definidas");
    process.exit(1);
  }

  // Mascara senha pro log
  const masked = url.replace(/:([^@]+)@/, ":****@");
  console.log("Conectando em:", masked);

  const sql = postgres(url, {
    prepare: false, // pooler 6543 não suporta prepared statements
    max: 1,
    connect_timeout: 10,
  });

  try {
    const rows = await sql`SELECT version() AS version, current_database() AS db, current_user AS usr`;
    console.log("✓ Conectou:");
    console.log(rows[0]);
  } catch (err) {
    console.error("✗ Erro de conexão:");
    console.error(err);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

main();
