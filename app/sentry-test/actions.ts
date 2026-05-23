"use server";

import * as Sentry from "@sentry/nextjs";

export async function triggerServerActionError(): Promise<void> {
  const error = new Error(
    `[sentry-test] Erro de propósito em Server Action @ ${new Date().toISOString()}`,
  );

  // Captura explícita + flush garantem que o evento sai antes do throw
  // (Server Actions terminam o processo em throws, sem dar tempo do
  // SDK enviar em background).
  Sentry.captureException(error);
  await Sentry.flush(2000);

  throw error;
}
