/**
 * Cancellation page. Shows appointment details and a confirm button.
 */
import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { withTenant } from "@/lib/db/tenant";
import { getBookingByToken } from "@/lib/db/queries/bookings";
import { getClinicBySlug } from "@/lib/db/queries/clinics";
import { formatDuration } from "@/lib/format";

import { CancelButton } from "./cancel-button";

const TZ = "UTC";

function formatDateTime(date: Date): string {
  return date.toLocaleString("en-US", {
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

  const clinic = await getClinicBySlug(slug);
  if (!clinic) notFound();

  const booking = await withTenant(clinic.id, (tx) =>
    getBookingByToken(tx, token),
  );
  if (!booking) notFound();

  if (booking.status !== "confirmed") {
    return (
      <div className="mx-auto w-full max-w-2xl space-y-4 px-4 py-8">
        <div className="flex items-center gap-3 text-muted-foreground">
          <AlertTriangle className="size-5 shrink-0" />
          <p className="text-sm">
            This booking has already been cancelled or completed — it can no
            longer be cancelled.
          </p>
        </div>
        <Link href={`/${slug}/agendar`} className={buttonVariants({ variant: "outline" })}>
          Book again
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 px-4 py-8">
      <div>
        <h1 className="text-xl font-bold">Cancel booking</h1>
        <p className="text-sm text-muted-foreground">
          You are about to cancel the appointment below.
        </p>
      </div>

      {/* Appointment details */}
      <div className="rounded-md border p-4 space-y-3 text-sm">
        <div className="grid grid-cols-[120px_1fr] gap-y-2">
          <span className="text-muted-foreground">Clinic</span>
          <span className="font-medium">{clinic.name}</span>

          <span className="text-muted-foreground">Service</span>
          <span>
            {booking.service.name}{" "}
            <span className="text-muted-foreground">
              ({formatDuration(booking.service.durationMinutes)})
            </span>
          </span>

          <span className="text-muted-foreground">Provider</span>
          <span>{booking.professional.name}</span>

          <span className="text-muted-foreground">Date & time</span>
          <span className="capitalize">{formatDateTime(booking.startsAt)}</span>

          <span className="text-muted-foreground">Patient</span>
          <span>{booking.patientName}</span>
        </div>
      </div>

      <CancelButton clinicSlug={slug} cancelToken={token} />

      <Link
        href={`/${slug}/confirmado/${token}`}
        className={buttonVariants({ variant: "ghost", size: "sm" })}
      >
        ← Back to booking
      </Link>
    </div>
  );
}
