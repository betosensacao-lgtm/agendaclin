"use client";

export function TriggerClientError() {
  return (
    <button
      type="button"
      onClick={() => {
        throw new Error(
          `[sentry-test] Erro de propósito no Client @ ${new Date().toISOString()}`,
        );
      }}
      className="w-full rounded-md border bg-card p-4 text-left text-sm hover:bg-accent"
    >
      <div className="font-medium">Client Component</div>
      <div className="mt-1 text-xs text-muted-foreground">
        Lança no browser (event handler). Cai no Sentry via
        instrumentation-client.ts.
      </div>
    </button>
  );
}
