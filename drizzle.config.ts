import { loadEnvConfig } from "@next/env";
import { defineConfig } from "drizzle-kit";

// Carrega .env.local (e demais arquivos .env) da mesma forma que o Next faz
// em runtime — assim a configuração do Drizzle "enxerga" as mesmas variáveis.
loadEnvConfig(process.cwd());

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL não definida. Configure .env.local antes de rodar migrations.",
  );
}

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  // Mantém migrations claras no diff.
  verbose: true,
  strict: true,
});
