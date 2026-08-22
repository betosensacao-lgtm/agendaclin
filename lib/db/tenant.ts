/**
 * Contexto de tenant para RLS real (ver drizzle/migrations/0002_real_tenant_rls.sql
 * + 0003_harden_rls_nullif.sql).
 *
 * As policies do banco leem `current_setting('app.clinic_id')`. Essa
 * variável de sessão só existe dentro de uma transação (`SET LOCAL`) —
 * por isso toda query tenant-scoped precisa rodar dentro de
 * `withTenant`, usando o `tx` que ele fornece (não o `db` global).
 *
 * Os 3 fluxos públicos por cancel_token (confirmado/cancelar/remarcar)
 * sempre têm o slug da clínica na URL — resolvem o clinicId via
 * getClinicBySlug e usam withTenant normalmente, sem precisar de um
 * mecanismo à parte pro token. A RLS ainda barra cross-tenant nesse
 * caso: se alguém colar um cancel_token de outra clínica numa URL com
 * o slug errado, `clinic_id = current_setting('app.clinic_id')` da
 * policy simplesmente não bate e a query não retorna nada.
 *
 * `set_config(..., true)` é usado em vez de `SET LOCAL app.x = '...'`
 * porque aceita bind parameter — evita concatenar string no SQL.
 */
import { sql } from "drizzle-orm";

import { db } from "@/lib/db";
import type { Transaction } from "@/lib/db/types";

/**
 * Roda `fn` dentro de uma transação com `app.clinic_id` setado. Toda
 * query dentro de `fn` DEVE usar o `tx` recebido (não `db` diretamente),
 * senão roda fora do contexto de tenant e a RLS bloqueia (ou, pior,
 * silenciosamente não filtra nada se a query também não tiver where).
 *
 * Uso:
 *   const bookings = await withTenant(clinicId, (tx) =>
 *     listBookingsInRange(tx, { clinicId, from, to }),
 *   );
 */
export async function withTenant<T>(
  clinicId: string,
  fn: (tx: Transaction) => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`SELECT set_config('app.clinic_id', ${clinicId}, true)`);
    return fn(tx);
  });
}

/**
 * Só para o bootstrap de signup (app/signup/actions.ts): cria a clinic +
 * o primeiro user SEM contexto de tenant — é o único caso em que isso é
 * intencional (ver clinics_tenant_insert / users_tenant_insert na
 * migration 0002, que permitem INSERT quando app.clinic_id é NULL).
 * Continua sendo uma transação normal do Drizzle, só nomeada pra deixar
 * a intenção explícita no call site.
 */
export const withNewTenantBootstrap = db.transaction.bind(db);
