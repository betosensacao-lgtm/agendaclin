"use server";

export async function triggerServerActionError(): Promise<void> {
  throw new Error(
    `[sentry-test] Erro de propósito em Server Action @ ${new Date().toISOString()}`,
  );
}
