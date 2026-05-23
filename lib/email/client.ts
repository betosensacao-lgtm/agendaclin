/**
 * Cliente Resend (cached). Lê RESEND_API_KEY do .env.
 *
 * Se a chave não existir, `getResend()` retorna null — pra ambiente de
 * desenvolvimento sem conta, os envios são silenciosamente pulados
 * (log no console).
 */
import { Resend } from "resend";

let cached: Resend | null | undefined;

export function getResend(): Resend | null {
  if (cached !== undefined) return cached;

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn(
      "[email] RESEND_API_KEY não definido — envios serão pulados.",
    );
    cached = null;
    return null;
  }

  cached = new Resend(apiKey);
  return cached;
}

export function getFromAddress(): string {
  return process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev";
}

export function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}
