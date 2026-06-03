/**
 * Agenda admin — visão diária (default) ou semanal das consultas.
 *
 * Filtros vêm via URL search params:
 *   ?date=YYYY-MM-DD&professionalId=...&view=day|week
 *
 * Tudo escopado por clinic_id do usuário admin logado.
 */
import { requireRole } from "@/lib/auth/guards";
import { listBookingsInRange } from "@/lib/db/queries/bookings";
import { listProfessionalsByClinic } from "@/lib/db/queries/professionals";
import {
  DEFAULT_TZ,
  dayRangeUtc,
  formatLongDate,
  formatTime,
  todayInTz,
  weekRangeUtc,
} from "@/lib/timezone";

import { AgendaFilters } from "./agenda-filters";
import {
  BookingActions,
  StatusBadge,
} from "../consultas/booking-actions";

const YMD = /^\d{4}-\d{2}-\d{2}$/;

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: Promise<{
    date?: string;
    professionalId?: string;
    view?: string;
  }>;
}) {
  const user = await requireRole("admin");
  const params = await searchParams;

  const today = todayInTz(DEFAULT_TZ);
  const date = params.date && YMD.test(params.date) ? params.date : today;
  const view: "day" | "week" = params.view === "week" ? "week" : "day";
  const professionalId = params.professionalId || null;

  // Carrega profissionais para o filtro (todos da clínica, mesmo inativos).
  const professionals = await listProfessionalsByClinic(user.clinicId);

  // Calcula range em UTC.
  const range =
    view === "week"
      ? weekRangeUtc(date, DEFAULT_TZ)
      : dayRangeUtc(date, DEFAULT_TZ);

  const bookings = await listBookingsInRange({
    clinicId: user.clinicId,
    from: range.from,
    to: range.to,
    professionalId,
  });

  // Agrupa por dia local (string YMD) para a visão semanal.
  const byDay = new Map<string, typeof bookings>();
  for (const b of bookings) {
    const ymd = b.startsAt
      .toLocaleDateString("sv-SE", { timeZone: DEFAULT_TZ })
      .slice(0, 10);
    const arr = byDay.get(ymd) ?? [];
    arr.push(b);
    byDay.set(ymd, arr);
  }

  // Lista de dias a renderizar.
  const days =
    view === "week"
      ? (range as ReturnType<typeof weekRangeUtc>).days
      : [date];

  // Total de bookings exibidos (excluindo cancelados pra contagem útil).
  const activeCount = bookings.filter((b) => b.status !== "cancelled").length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Schedule</h1>
          <p className="text-sm text-muted-foreground">
            {activeCount} appointment{activeCount !== 1 ? "s" : ""}{" "}
            {view === "week" ? "this week" : "today"}
            {professionalId && " (filter active)"}.
          </p>
        </div>
      </div>

      <AgendaFilters
        professionals={professionals.map((p) => ({ id: p.id, name: p.name }))}
        date={date}
        professionalId={professionalId}
        view={view}
      />

      {bookings.length === 0 ? (
        <p className="rounded-md border p-6 text-center text-sm text-muted-foreground">
          No appointments in this period.
        </p>
      ) : (
        <div className="space-y-6">
          {days.map((dayYmd) => {
            const dayBookings = byDay.get(dayYmd) ?? [];
            // Em visão semanal, mostra todos os dias mesmo sem bookings.
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
                            {b.service.name} · {b.professional.name}
                          </div>
                        </div>

                        <StatusBadge status={b.status} />
                        <BookingActions
                          bookingId={b.id}
                          status={b.status}
                        />
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
