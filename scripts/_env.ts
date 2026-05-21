/**
 * Side-effect-only: carrega .env.local antes de qualquer outro import.
 *
 * Uso: `import "./_env";` como PRIMEIRO import em scripts/*.
 * Necessário porque imports são avaliados antes de statements top-level —
 * sem isso, importar lib/db (que lê DATABASE_URL) acontece antes do load.
 */
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());
