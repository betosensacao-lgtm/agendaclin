/**
 * Página de cancelamento. Exibe os detalhes da consulta e um botão para
 * confirmar o cancelamento. Se já cancelada, mostra aviso.
 */
import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { getBookingByToken } from "@/lib/db/queries/bookings";
import { getClinicBySlug } from "@/lib/db/queries/clinics";
import { formatDuration } from "@/lib/format";

import { CancelButton } from "./cancel-button";

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

export default async function CancelarPage({
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

  // Se já cancelado, aviso e link para agendar novamente.
  if (booking.status !== "confirmed") {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 text-muted-foreground">
          <AlertTriangle className="size-5 shrink-0" />
          <p className="text-sm">
            Este agendamento já foi cancelado ou finalizado — não é mais
            possível cancelá-lo.
          </p>
        </div>
        <Link href={`/${slug}/agendar`} className={buttonVariants({ variant: "outline" })}>
          Agendar novamente
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">Cancelar agendamento</h1>
        <p className="text-sm text-muted-foreground">
          Você está prestes a cancelar a consulta abaixo.
        </p>
      </div>

      {/* Detalhes da consulta */}
      <div className="rounded-md border p-4 space-y-3 text-sm">
        <div className="grid grid-cols-[120px_1fr] gap-y-2">
          <span className="text-muted-foreground">Clínica</span>
          <span className="font-medium">{clinic.name}</span>

          <span className="text-muted-foreground">Serviço</span>
          <span>
            {booking.service.name}{" "}
            <span className="text-muted-foreground">
              ({formatDuration(booking.service.durationMinutes)})
            </span>
          </span>

          <span className="text-muted-foreground">Profissional</span>
          <span>{booking.professional.name}</span>

          <span className="text-muted-foreground">Data e hora</span>
          <span className="capitalize">{formatDateTime(booking.startsAt)}</span>

          <span className="text-muted-foreground">Paciente</span>
          <span>{booking.patientName}</span>
        </div>
      </div>

      <CancelButton clinicSlug={slug} cancelToken={token} />

      <Link
        href={`/${slug}/confirmado/${token}`}
        className={buttonVariants({ variant: "ghost", size: "sm" })}
      >
        ← Voltar ao agendamento
      </Link>
    </div>
  );
}
