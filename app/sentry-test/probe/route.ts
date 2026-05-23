/**
 * Endpoint de diagnóstico do Sentry. Retorna JSON com o que o SDK
 * conseguiu fazer e quanto demorou.
 *
 * GET /sentry-test/probe → tenta capturar erro + flush, retorna estado.
 */
import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function maskDsn(dsn: string | undefined): string {
  if (!dsn) return "MISSING";
  // Mascara o key mas mantém o host visível.
  return dsn.replace(/(https?:\/\/)[^@]+(@.*)/, "$1***$2");
}

export async function GET() {
  const startedAt = Date.now();

  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  const client = Sentry.getClient();
  const hub = Sentry.getCurrentScope();

  let captureResult: string;
  let flushResult: string;
  let flushDurationMs: number | null = null;

  try {
    const eventId = Sentry.captureException(
      new Error(`[sentry-probe] Test @ ${new Date().toISOString()}`),
    );
    captureResult = eventId ? `eventId=${eventId}` : "eventId=undefined";
  } catch (e) {
    captureResult = `THREW: ${e instanceof Error ? e.message : String(e)}`;
  }

  const flushStartedAt = Date.now();
  try {
    const ok = await Sentry.flush(5000);
    flushDurationMs = Date.now() - flushStartedAt;
    flushResult = `ok=${ok}`;
  } catch (e) {
    flushDurationMs = Date.now() - flushStartedAt;
    flushResult = `THREW: ${e instanceof Error ? e.message : String(e)}`;
  }

  return NextResponse.json(
    {
      dsn: maskDsn(dsn),
      nodeEnv: process.env.NODE_ENV ?? "unset",
      vercelEnv: process.env.VERCEL_ENV ?? "unset",
      clientLoaded: Boolean(client),
      clientDsn: maskDsn(client?.getDsn()?.host),
      hasScope: Boolean(hub),
      captureResult,
      flushResult,
      flushDurationMs,
      totalDurationMs: Date.now() - startedAt,
    },
    {
      status: 200,
      headers: { "cache-control": "no-store" },
    },
  );
}
