/**
 * Página pública de remarcação. Mostra detalhes da consulta atual +
 * grid de slots disponíveis pra escolher novo horário (mesmo serviço,
 * mesmo profissional).
 *
 * Se booking já cancelado/finalizado, mostra aviso e link pra agendar de novo.
 */
import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { getBookingByToken } from "@/lib/db/queries/bookings";
import { getClinicBySlug } from "@/lib/db/queries/clinics";
import { formatDuration } from "@/lib/format";

import { RescheduleForm } from "./reschedule-form";

const TZ = "America/Sao_Paulo";

function formatDateTime(date: Date): string {
  return date.toLocaleString("pt-BR", {
    timeZone: TZ,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export default async function RemarcarPage({
  params,
}: {
  params: Promise<{ slug: string; token: string }>;
}) {
  const { slug, token } = await params;

  const [clinic, booking] = await Promise.all([
    getClinicBySlug(slug),
    getBookingByToken(token),
  ]);

  if (!clinic || !booking) notFound();

  if (booking.status !== "confirmed") {
    return (
      <div className="mx-auto w-full max-w-2xl space-y-4 px-4 py-8">
        <div className="flex items-center gap-3 text-muted-foreground">
          <AlertTriangle className="size-5 shrink-0" />
          <p className="text-sm">
            Esta consulta já foi cancelada ou finalizada — não é mais possível
            remarcá-la.
          </p>
        </div>
        <Link
          href={`/${slug}/agendar`}
          className={buttonVariants({ variant: "outline" })}
        >
          Agendar nova consulta
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 px-4 py-8">
      <div>
        <h1 className="text-xl font-bold">Remarcar agendamento</h1>
        <p className="text-sm text-muted-foreground">
          Escolha um novo horário com {booking.professional.name}.
        </p>
      </div>

      {/* Resumo atual */}
      <div className="rounded-md border bg-muted/30 p-4 text-sm space-y-2">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          Agendamento atual
        </p>
        <p>
          <span className="font-medium">{booking.service.name}</span>{" "}
          <span className="text-muted-foreground">
            ({formatDuration(booking.service.durationMinutes)})
          </span>
        </p>
        <p className="capitalize">{formatDateTime(booking.startsAt)}</p>
      </div>

      <RescheduleForm
        clinic={{
          slug: clinic.slug,
          timezone: clinic.timezone,
        }}
        cancelToken={token}
        currentStartsAt={booking.startsAt.toISOString()}
      />

      <Link
        href={`/${slug}/confirmado/${token}`}
        className={buttonVariants({ variant: "ghost", size: "sm" })}
      >
        ← Voltar
      </Link>
    </div>
  );
}
