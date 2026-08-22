/**
 * Cliente Drizzle dedicado para jobs de cron (hoje só o lembrete de
 * WhatsApp) que precisam ler bookings de TODAS as clínicas — um caso
 * legítimo de leitura cross-tenant que não se encaixa no modelo
 * withTenant(clinicId, ...) do resto do app.
 *
 * Usa `CRON_DATABASE_URL`, conectado como role `app_cron` (RLS real,
 * mas com policies de leitura ampliadas só pra essa role — ver
 * drizzle/migrations/0002_real_tenant_rls.sql). Nunca aponte essa var
 * para a role `postgres`/admin — o objetivo é o cron continuar sujeito
 * a RLS, só que com um escopo de leitura mais largo que o `app_runtime`.
 */
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

const connectionString = process.env.CRON_DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "CRON_DATABASE_URL não definida. Copie .env.example para .env.local e preencha " +
      "com a connection string da role app_cron.",
  );
}

const globalForPg = globalThis as unknown as {
  pgCronClient?: ReturnType<typeof postgres>;
};

const client =
  globalForPg.pgCronClient ??
  postgres(connectionString, {
    prepare: !connectionString.includes(":6543"),
    max: 2, // cron roda 1x/hora, não precisa de pool grande
    connect_timeout: 30,
    idle_timeout: 20,
  });

if (process.env.NODE_ENV !== "production") {
  globalForPg.pgCronClient = client;
}

export const cronDb = drizzle(client, { schema });
