/**
 * Página de confirmação do agendamento.
 * Exibe o resumo da consulta e um link para cancelar.
 */
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2 } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { getBookingByToken } from "@/lib/db/queries/bookings";
import { getClinicBySlug } from "@/lib/db/queries/clinics";
import { formatDuration } from "@/lib/format";

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

export default async function ConfirmadoPage({
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

  const isCancelled = booking.status === "cancelled";

  return (
    <div className="space-y-6">
      {isCancelled ? (
        <>
          <div className="flex items-center gap-3 text-muted-foreground">
            <div className="rounded-full border p-2">
              <CheckCircle2 className="size-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">
                Consulta cancelada
              </h1>
              <p className="text-sm">Este agendamento foi cancelado.</p>
            </div>
          </div>

          <Link href={`/${slug}/agendar`} className={buttonVariants({ variant: "outline" })}>
            Agendar novamente
          </Link>
        </>
      ) : (
        <>
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-green-100 p-2 text-green-700 dark:bg-green-900 dark:text-green-300">
              <CheckCircle2 className="size-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold">Agendamento confirmado!</h1>
              <p className="text-sm text-muted-foreground">
                Vemos você em breve, {booking.patientName.split(" ")[0]}.
              </p>
            </div>
          </div>

          {/* Resumo */}
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
              <span className="capitalize">
                {formatDateTime(booking.startsAt)}
              </span>

              <span className="text-muted-foreground">Paciente</span>
              <span>{booking.patientName}</span>

              <span className="text-muted-foreground">E-mail</span>
              <span>{booking.patientEmail}</span>

              <span className="text-muted-foreground">Telefone</span>
              <span>{booking.patientPhone}</span>
            </div>
          </div>

          {/* Remarcar / cancelar */}
          <div className="rounded-md border border-dashed p-4 text-sm space-y-3">
            <p className="font-medium">Precisa mudar algo?</p>
            <p className="text-muted-foreground">
              Você pode remarcar ou cancelar até o dia da consulta —
              sem precisar ligar.
            </p>
            <div className="flex flex-wrap gap-2">
              <Link
                href={`/${slug}/remarcar/${token}`}
                className={buttonVariants({ size: "sm" })}
              >
                Remarcar
              </Link>
              <Link
                href={`/${slug}/cancelar/${token}`}
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                Cancelar
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
