/**
 * Script ad-hoc para diagnosticar conexão com o Postgres do Supabase.
 * Roda com: pnpm exec tsx scripts/test-db-connection.ts
 */
import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

import postgres from "postgres";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL não definida");
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
