/**
 * Agenda do profissional logado — visão diária/semanal das próprias consultas.
 *
 * Filtros via URL: ?date=YYYY-MM-DD&view=day|week
 *
 * Diferenças vs. /agenda admin:
 *   - Não tem filtro de profissional (o pro só vê o que é dele).
 *   - Mostra as MESMAS ações inline (atender/falta/cancelar) — secretárias
 *     e pros costumam dividir essa tarefa.
 */
import { redirect } from "next/navigation";

import { requireRole } from "@/lib/auth/guards";
import { withTenant } from "@/lib/db/tenant";
import { listBookingsInRange } from "@/lib/db/queries/bookings";
import { getProfessionalByUserId } from "@/lib/db/queries/professionals";
import {
  DEFAULT_TZ,
  dayRangeUtc,
  formatLongDate,
  formatTime,
  todayInTz,
  weekRangeUtc,
} from "@/lib/timezone";

import {
  BookingActions,
  StatusBadge,
} from "../../(admin)/consultas/booking-actions";
import { MinhaAgendaFilters } from "./minha-agenda-filters";

const YMD = /^\d{4}-\d{2}-\d{2}$/;

export default async function MinhaAgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; view?: string }>;
}) {
  const user = await requireRole("professional");
  const params = await searchParams;

  const today = todayInTz(DEFAULT_TZ);
  const date = params.date && YMD.test(params.date) ? params.date : today;
  const view: "day" | "week" = params.view === "week" ? "week" : "day";

  const range =
    view === "week"
      ? weekRangeUtc(date, DEFAULT_TZ)
      : dayRangeUtc(date, DEFAULT_TZ);

  const { pro, bookings } = await withTenant(user.clinicId, async (tx) => {
    // Descobre o profissional vinculado a esse usuário.
    const pro = await getProfessionalByUserId(tx, user.id, user.clinicId);
    if (!pro) return { pro: null, bookings: [] };

    const bookings = await listBookingsInRange(tx, {
      clinicId: user.clinicId,
      from: range.from,
      to: range.to,
      professionalId: pro.id,
    });
    return { pro, bookings };
  });

  if (!pro) {
    // User com role=professional mas sem vínculo na tabela professionals.
    // Estado inconsistente — desloga e manda pro login com aviso.
    redirect("/login?error=no_professional_link");
  }

  // Agrupa por dia local pra visão semanal.
  const byDay = new Map<string, typeof bookings>();
  for (const b of bookings) {
    const ymd = b.startsAt
      .toLocaleDateString("sv-SE", { timeZone: DEFAULT_TZ })
      .slice(0, 10);
    const arr = byDay.get(ymd) ?? [];
    arr.push(b);
    byDay.set(ymd, arr);
  }

  const days =
    view === "week"
      ? (range as ReturnType<typeof weekRangeUtc>).days
      : [date];

  const activeCount = bookings.filter((b) => b.status !== "cancelled").length;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">My Schedule</h1>
        <p className="text-sm text-muted-foreground">
          {pro.name} · {activeCount} appointment{activeCount !== 1 ? "s" : ""}{" "}
          {view === "week" ? "this week" : "today"}.
        </p>
      </div>

      <MinhaAgendaFilters date={date} view={view} />

      {bookings.length === 0 ? (
        <p className="rounded-md border p-6 text-center text-sm text-muted-foreground">
          No appointments in this period.
        </p>
      ) : (
        <div className="space-y-6">
          {days.map((dayYmd) => {
            const dayBookings = byDay.get(dayYmd) ?? [];
            if (view === "day" && dayBookings.length === 0) return null;

            const [y, m, d] = dayYmd.split("-").map(Number);
            const headerDate = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));

            return (
              <div key={dayYmd}>
                <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  {formatLongDate(headerDate, DEFAULT_TZ)}
                </h2>

                {dayBookings.length === 0 ? (
                  <p className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
                    No appointments.
                  </p>
                ) : (
                  <ul className="divide-y rounded-md border">
                    {dayBookings.map((b) => (
                      <li
                        key={b.id}
                        className="flex flex-wrap items-center gap-3 p-3 text-sm"
                      >
                        <div className="w-20 shrink-0 font-mono text-base tabular-nums">
                          {formatTime(b.startsAt, DEFAULT_TZ)}
                        </div>

                        <div className="min-w-0 flex-1 space-y-0.5">
                          <div className="truncate font-medium">
                            {b.patientName}
                          </div>
                          <div className="truncate text-xs text-muted-foreground">
                            {b.service.name} · {b.patientPhone}
                          </div>
                        </div>

                        <StatusBadge status={b.status} />
                        <BookingActions bookingId={b.id} status={b.status} />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
