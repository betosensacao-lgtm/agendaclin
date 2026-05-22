/**
 * Vitest configurado para Node environment (testes de lógica pura,
 * sem DOM). Imports com alias `@/*` resolvidos via `vite-tsconfig-paths`
 * — alternativa simples: definir `resolve.alias` manualmente abaixo
 * para evitar nova dep.
 */
import path from "node:path";

import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    globals: false,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
