/**
 * Timezone helpers — single source of truth for timezone conversions.
 *
 * Conventions:
 *   - Database stores timestamps in UTC (timestamptz).
 *   - UI/emails use the clinic's timezone (UTC as default for international use).
 *   - Always pass `tz` as a param — never hard-code the timezone in components.
 */
import { fromZonedTime } from "date-fns-tz";

export const DEFAULT_TZ = "UTC";

/**
 * Converts a local date (YYYY-MM-DD) in the clinic's timezone to the
 * start and end of that day in UTC. Useful for "bookings on day X" filters.
 */
export function dayRangeUtc(
  ymd: string,
  tz: string = DEFAULT_TZ,
): { from: Date; to: Date } {
  const from = fromZonedTime(`${ymd}T00:00:00`, tz);
  // Next day in local time (not UTC) to handle DST correctly.
  const next = (() => {
    const d = new Date(`${ymd}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + 1);
    return d.toISOString().slice(0, 10);
  })();
  const to = fromZonedTime(`${next}T00:00:00`, tz);
  return { from, to };
}

/**
 * Range for the week starting on the Sunday of local `ymd`.
 * Returns {from, to} in UTC. Used by the "week" view in /agenda.
 */
export function weekRangeUtc(
  ymd: string,
  tz: string = DEFAULT_TZ,
): { from: Date; to: Date; days: string[] } {
  const [y, m, d] = ymd.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const weekday = date.getUTCDay(); // 0 = Sunday
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

/** Returns "YYYY-MM-DD" in the clinic's timezone for today. */
export function todayInTz(tz: string = DEFAULT_TZ): string {
  const parts = new Date().toLocaleString("sv-SE", { timeZone: tz });
  return parts.slice(0, 10);
}

/** Formats a Date as "HH:MM" in the clinic's timezone. */
export function formatTime(d: Date, tz: string = DEFAULT_TZ): string {
  return d.toLocaleTimeString("en-US", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/** Formats a Date as "ddd, MM/dd" in the clinic's timezone. */
export function formatShortDate(d: Date, tz: string = DEFAULT_TZ): string {
  return d.toLocaleDateString("en-US", {
    timeZone: tz,
    weekday: "short",
    month: "2-digit",
    day: "2-digit",
  });
}

/** Formats a Date as "Weekday, Month Day" in the clinic's timezone. */
export function formatLongDate(d: Date, tz: string = DEFAULT_TZ): string {
  return d.toLocaleDateString("en-US", {
    timeZone: tz,
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}
