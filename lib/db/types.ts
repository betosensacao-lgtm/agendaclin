import type { db } from "@/lib/db";

/**
 * Tipo do `tx` recebido dentro de `db.transaction(async (tx) => ...)`.
 * Extraído genericamente do próprio `db` (em vez de importar tipos
 * internos do drizzle-orm/pg-core) pra não quebrar se a versão do
 * drizzle mudar a forma exata do generic.
 */
export type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * `db`/`tx`/o cliente dedicado do cron (lib/db/cron.ts) têm a mesma
 * superfície de query builder — usado pelas poucas funções (ex.:
 * getBookingsDueForReminder) que rodam tanto dentro de uma transação
 * tenant-scoped quanto no cron job cross-tenant.
 */
export type DbClient = typeof db | Transaction;
