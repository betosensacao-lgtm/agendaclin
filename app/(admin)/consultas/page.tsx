/**
 * Lista paginada de consultas (todos os bookings da clínica).
 *
 * Filtros via URL search params:
 *   ?page=1&professionalId=...&status=confirmed
 *
 * Ações inline em cada linha (BookingActions): cancelar, atender, no-show.
 */
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireRole } from "@/lib/auth/guards";
import {
  type BookingStatus,
  listBookingsPaginated,
} from "@/lib/db/queries/bookings";
import { listProfessionalsByClinic } from "@/lib/db/queries/professionals";
import {
  DEFAULT_TZ,
  formatShortDate,
  formatTime,
} from "@/lib/timezone";

import { BookingActions, StatusBadge } from "./booking-actions";
import { ConsultasFilters } from "./consultas-filters";

const PAGE_SIZE = 50;
const ALLOWED_STATUSES: BookingStatus[] = [
  "confirmed",
  "cancelled",
  "attended",
  "no_show",
];

function isStatus(s: string): s is BookingStatus {
  return (ALLOWED_STATUSES as string[]).includes(s);
}

export default async function ConsultasPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    professionalId?: string;
    status?: string;
  }>;
}) {
  const user = await requireRole("admin");
  const params = await searchParams;

  const page = Math.max(1, Number(params.page) || 1);
  const professionalId = params.professionalId || null;
  const status = params.status && isStatus(params.status) ? params.status : null;

  const [professionals, { rows, total }] = await Promise.all([
    listProfessionalsByClinic(user.clinicId),
    listBookingsPaginated({
      clinicId: user.clinicId,
      page,
      pageSize: PAGE_SIZE,
      professionalId,
      statuses: status ? [status] : undefined,
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function pageUrl(p: number): string {
    const sp = new URLSearchParams();
    sp.set("page", String(p));
    if (professionalId) sp.set("professionalId", professionalId);
    if (status) sp.set("status", status);
    return `/consultas?${sp.toString()}`;
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Consultas</h1>
          <p className="text-sm text-muted-foreground">
            {total} consulta{total !== 1 ? "s" : ""} no total
            {(status || professionalId) && " (filtros ativos)"}.
          </p>
        </div>
      </div>

      <ConsultasFilters
        professionals={professionals.map((p) => ({ id: p.id, name: p.name }))}
        professionalId={professionalId}
        status={status}
      />

      {rows.length === 0 ? (
        <p className="rounded-md border p-6 text-center text-sm text-muted-foreground">
          Nenhuma consulta encontrada.
        </p>
      ) : (
        <>
          <div className="overflow-hidden rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[140px]">Quando</TableHead>
                  <TableHead>Paciente</TableHead>
                  <TableHead>Serviço · Profissional</TableHead>
                  <TableHead className="w-[110px]">Status</TableHead>
                  <TableHead className="w-[140px] text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell className="font-mono text-xs tabular-nums">
                      <div>{formatShortDate(b.startsAt, DEFAULT_TZ)}</div>
                      <div className="text-muted-foreground">
                        {formatTime(b.startsAt, DEFAULT_TZ)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{b.patientName}</div>
                      <div className="text-xs text-muted-foreground">
                        {b.patientEmail} · {b.patientPhone}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      <div>{b.service.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {b.professional.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={b.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <BookingActions bookingId={b.id} status={b.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Paginação */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between text-sm">
              <p className="text-muted-foreground">
                Página {page} de {totalPages}
              </p>
              <div className="flex gap-2">
                {page > 1 ? (
                  <Link
                    href={pageUrl(page - 1)}
                    className={buttonVariants({ variant: "outline", size: "sm" })}
                  >
                    ← Anterior
                  </Link>
                ) : (
                  <span
                    className={`${buttonVariants({ variant: "outline", size: "sm" })} pointer-events-none opacity-50`}
                  >
                    ← Anterior
                  </span>
                )}
                {page < totalPages ? (
                  <Link
                    href={pageUrl(page + 1)}
                    className={buttonVariants({ variant: "outline", size: "sm" })}
                  >
                    Próxima →
                  </Link>
                ) : (
                  <span
                    className={`${buttonVariants({ variant: "outline", size: "sm" })} pointer-events-none opacity-50`}
                  >
                    Próxima →
                  </span>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
