/**
 * Sentry — runtime browser. Carregado automaticamente pelo Next em
 * client components. Versão mínima sem Session Replay (bundle leve).
 */
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: process.env.NODE_ENV === "production",

  // Performance traces no client — 10% das navegações.
  tracesSampleRate: 0.1,

  // Session Replay desligado pra evitar overhead. Habilite se quiser
  // ver gravações das sessões com erro depois (cobre 1-2 MB por sessão).
  replaysOnErrorSampleRate: 0,
  replaysSessionSampleRate: 0,

  environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? "development",
});

// Captura erros de navegação client-side.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
