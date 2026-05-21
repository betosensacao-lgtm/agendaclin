import { loadEnvConfig } from "@next/env";
import { defineConfig } from "drizzle-kit";

// Carrega .env.local (e demais arquivos .env) da mesma forma que o Next faz
// em runtime — assim a configuração do Drizzle "enxerga" as mesmas variáveis.
loadEnvConfig(process.cwd());

// Prefere DIRECT_URL (porta 5432) — drizzle-kit usa prepared statements e
// o transaction pooler (6543) não suporta. Fallback pra DATABASE_URL.
const migrationsUrl = process.env.DIRECT_URL ?? process.env.DATABASE_URL;

if (!migrationsUrl) {
  throw new Error(
    "DIRECT_URL ou DATABASE_URL não definida. Configure .env.local antes de rodar migrations.",
  );
}

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: migrationsUrl,
  },
  // Mantém migrations claras no diff.
  verbose: true,
  strict: true,
});
