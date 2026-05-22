/**
 * Helpers de timezone — single source of truth para conversões de fuso.
 *
 * Convenções do projeto:
 *   - Banco guarda timestamps em UTC (`timestamptz`).
 *   - UI/email usam o fuso da clínica (`America/Sao_Paulo` no MVP).
 *   - A clínica define o `timezone` em sua linha (table `clinics.timezone`),
 *     mas no MVP é fixo. Mesmo assim, sempre passamos o `tz` como param
 *     pra não acoplar.
 */
import { fromZonedTime } from "date-fns-tz";

export const DEFAULT_TZ = "America/Sao_Paulo";

/**
 * Converte uma data local (YYYY-MM-DD) no fuso da clínica para o início e
 * fim daquele dia em UTC. Útil para filtros tipo "agendamentos do dia X".
 */
export function dayRangeUtc(
  ymd: string,
  tz: string = DEFAULT_TZ,
): { from: Date; to: Date } {
  const from = fromZonedTime(`${ymd}T00:00:00`, tz);
  // 24h depois ainda em local time (não em UTC) para lidar com DST.
  const next = (() => {
    const d = new Date(`${ymd}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + 1);
    return d.toISOString().slice(0, 10);
  })();
  const to = fromZonedTime(`${next}T00:00:00`, tz);
  return { from, to };
}

/**
 * Range de uma semana começando no domingo do dia local `ymd`.
 * Retorna {from, to} em UTC. Usado pela visão "semana" da /agenda.
 */
export function weekRangeUtc(
  ymd: string,
  tz: string = DEFAULT_TZ,
): { from: Date; to: Date; days: string[] } {
  // Calcula o domingo da semana do `ymd` em local time (UTC arithmetic
  // funciona porque YMD é mesmo dia em qualquer fuso).
  const [y, m, d] = ymd.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const weekday = date.getUTCDay(); // 0 = domingo
  date.setUTCDate(date.getUTCDate() - weekday);

  const days: string[] = [];
  for (let i = 0; i < 7; i++) {
    const yy = date.getUTCFullYear();
    const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(date.getUTCDate()).padStart(2, "0");
    days.push(`${yy}-${mm}-${dd}`);
    date.setUTCDate(date.getUTCDate() + 1);
  }

  const { from } = dayRangeUtc(days[0], tz);
  const { to } = dayRangeUtc(days[6], tz);
  return { from, to, days };
}

/** Retorna "YYYY-MM-DD" no fuso da clínica para a data atual. */
export function todayInTz(tz: string = DEFAULT_TZ): string {
  // sv-SE formata como "YYYY-MM-DD HH:MM:SS"; pegamos só o YMD.
  const parts = new Date().toLocaleString("sv-SE", { timeZone: tz });
  return parts.slice(0, 10);
}

/** Formata um Date como "HH:MM" no fuso da clínica. */
export function formatTime(d: Date, tz: string = DEFAULT_TZ): string {
  return d.toLocaleTimeString("pt-BR", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/** Formata um Date como "ddd, dd/MM" no fuso da clínica. */
export function formatShortDate(d: Date, tz: string = DEFAULT_TZ): string {
  return d.toLocaleDateString("pt-BR", {
    timeZone: tz,
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  });
}

/** Formata um Date como "dddd, dd 'de' MMMM" no fuso da clínica. */
export function formatLongDate(d: Date, tz: string = DEFAULT_TZ): string {
  return d.toLocaleDateString("pt-BR", {
    timeZone: tz,
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}
