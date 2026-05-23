/**
 * Sentry — runtime Node (Server Components, Server Actions, Route Handlers).
 * Carregado via instrumentation.ts.
 */
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Captura tudo em prod; em dev fica desligado pra não poluir.
  enabled: process.env.NODE_ENV === "production",

  // Sample rate de performance traces. 0.1 = 10% das requests. Sobe se
  // quiser mais granularidade depois.
  tracesSampleRate: 0.1,

  // Não envia info de PII por padrão. Habilite só se realmente precisar.
  sendDefaultPii: false,

  // Identifica ambientalmente no painel Sentry.
  environment: process.env.VERCEL_ENV ?? "development",
});
