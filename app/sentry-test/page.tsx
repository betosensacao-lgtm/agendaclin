/**
 * Rota de teste — joga um erro de propósito pra validar que o Sentry
 * está capturando. Acesse https://agendaclin.vercel.app/sentry-test
 *
 * Tipo de erro:
 *   ?type=server   → Erro lançado em Server Component (default)
 *   ?type=client   → Erro lançado em event handler client-side
 *   ?type=action   → Erro lançado dentro de uma Server Action
 *
 * Esta rota é PÚBLICA (sem auth) — segura porque só joga erro, não
 * expõe dados. Remova depois de validar se quiser.
 */
import { TriggerClientError } from "./trigger-client-error";
import { triggerServerActionError } from "./actions";

export default async function SentryTestPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const { type } = await searchParams;

  if (type === "server") {
    // Server Component lança — vai cair no Sentry via onRequestError
    // do instrumentation.ts.
    throw new Error(
      `[sentry-test] Erro de propósito no Server Component @ ${new Date().toISOString()}`,
    );
  }

  return (
    <div className="mx-auto max-w-2xl p-8 space-y-4">
      <h1 className="text-2xl font-bold">Sentry — teste de captura</h1>
      <p className="text-sm text-muted-foreground">
        Clique num botão pra disparar um erro e validar que o Sentry está
        recebendo. Cada tipo testa um runtime diferente.
      </p>

      <div className="grid gap-3 sm:grid-cols-3">
        <a
          href="/sentry-test?type=server"
          className="rounded-md border bg-card p-4 text-sm hover:bg-accent"
        >
          <div className="font-medium">Server Component</div>
          <div className="mt-1 text-xs text-muted-foreground">
            Lança no render server-side. Vai aparecer no Sentry como
            "Server-side" / "Next.js".
          </div>
        </a>

        <form action={triggerServerActionError}>
          <button
            type="submit"
            className="w-full rounded-md border bg-card p-4 text-left text-sm hover:bg-accent"
          >
            <div className="font-medium">Server Action</div>
            <div className="mt-1 text-xs text-muted-foreground">
              Lança dentro de uma action via form submit. Boa simulação
              do fluxo real de booking.
            </div>
          </button>
        </form>

        <TriggerClientError />
      </div>

      <p className="text-xs text-muted-foreground">
        ⚠️ Em dev local nada acontece (Sentry desligado por NODE_ENV).
        Funciona só em produção.
      </p>
    </div>
  );
}
