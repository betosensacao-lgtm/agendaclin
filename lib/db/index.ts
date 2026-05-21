/**
 * Cliente Drizzle + postgres-js.
 *
 * Uso:
 *   import { db } from "@/lib/db";
 *   import { services } from "@/lib/db/schema";
 *   await db.select().from(services);
 *
 * - `postgres()` mantém um pool conectado. Em dev/HMR, reutilizamos a
 *   instância via globalThis pra não vazar conexão a cada reload.
 * - Em produção (Vercel serverless), cada cold start cria um pool novo;
 *   o pooler do Supabase (porta 6543) lida com isso.
 */
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL não definida. Copie .env.example para .env.local e preencha.",
  );
}

const globalForPg = globalThis as unknown as {
  pgClient?: ReturnType<typeof postgres>;
};

const client =
  globalForPg.pgClient ??
  postgres(connectionString, {
    // Supabase pooler requer prepare:false; conexão direta aceita true.
    // Detecção simples pela porta 6543 (pooler) vs 5432 (direct).
    prepare: !connectionString.includes(":6543"),
    max: 10,
  });

if (process.env.NODE_ENV !== "production") {
  globalForPg.pgClient = client;
}

export const db = drizzle(client, { schema });

export { schema };
