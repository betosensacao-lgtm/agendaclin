import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
};

export default withSentryConfig(nextConfig, {
  // Identificadores do projeto Sentry — fixos a partir do DSN fornecido.
  org: "o4511439656189952",
  project: "4511439661105232",

  // Silencia logs do plugin no build. Bom pra CI.
  silent: !process.env.CI,

  // Não envia source maps se não tiver token (CI/local sem auth).
  // Em produção (Vercel), setamos SENTRY_AUTH_TOKEN como env var pra
  // upload automático e desofuscar stack traces.
  sourcemaps: {
    disable: !process.env.SENTRY_AUTH_TOKEN,
  },

  // Cria um tunnel route /monitoring que esconde requests do ad-blocker.
  // Útil pra não perder erros de browsers com uBlock/Brave.
  tunnelRoute: "/monitoring",
});
