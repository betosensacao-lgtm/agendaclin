/**
 * Entrypoint do Next.js para inicialização condicional por runtime.
 * Carrega o config correto do Sentry conforme onde o código roda.
 *
 * Doc: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */
import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

// Captura erros não tratados em Server Components / Server Actions
// e propaga pro Sentry com tags úteis.
export const onRequestError = Sentry.captureRequestError;
