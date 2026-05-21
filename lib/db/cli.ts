/**
 * Cliente Drizzle dedicado a scripts CLI (seed, diagnostics, migrações
 * ad-hoc). Difere de `./index.ts` em duas coisas:
 *
 *   1. Prefere `DIRECT_URL` (porta 5432) sobre `DATABASE_URL` (pooler 6543).
 *      O transaction pooler do Supabase é otimizado para apps stateless
 *      (Vercel) e pode dar timeout em conexões mais longas/distantes.
 *
 *   2. Não compartilha pool com runtime — exporta `closeDbCli()` para
 *      fechar conexões antes do process.exit, evitando deixar sockets
 *      pendurados no pooler.
 *
 * Uso em scripts:
 *   import "./_env";                       // PRIMEIRO
 *   import { dbCli, closeDbCli } from "../lib/db/cli";
 *   try { ... } finally { await closeDbCli(); }
 */
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

const connectionString =
  process.env.DIRECT_URL ?? process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "Nem DIRECT_URL nem DATABASE_URL estão definidas. Configure .env.local.",
  );
}

const client = postgres(connectionString, {
  prepare: !connectionString.includes(":6543"),
  max: 1, // CLI: single connection
  connect_timeout: 60,
  idle_timeout: 10,
});

export const dbCli = drizzle(client, { schema });

export async function closeDbCli() {
  await client.end({ timeout: 5 });
}

export { schema };
