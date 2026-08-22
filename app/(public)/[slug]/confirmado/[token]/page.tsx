/**
 * Booking confirmation page.
 * Shows a summary and links to reschedule/cancel.
 */
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2 } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { withTenant } from "@/lib/db/tenant";
import { getBookingByToken } from "@/lib/db/queries/bookings";
import { getClinicBySlug } from "@/lib/db/queries/clinics";
import { formatDuration } from "@/lib/format";

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

export default async function ConfirmadoPage({
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

  const isCancelled = booking.status === "cancelled";

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 px-4 py-8">
      {isCancelled ? (
        <>
          <div className="flex items-center gap-3 text-muted-foreground">
            <div className="rounded-full border p-2">
              <CheckCircle2 className="size-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">
                Booking cancelled
              </h1>
              <p className="text-sm">This appointment has been cancelled.</p>
            </div>
          </div>

          <Link href={`/${slug}/agendar`} className={buttonVariants({ variant: "outline" })}>
            Book again
          </Link>
        </>
      ) : (
        <>
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-green-100 p-2 text-green-700 dark:bg-green-900 dark:text-green-300">
              <CheckCircle2 className="size-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold">Booking confirmed!</h1>
              <p className="text-sm text-muted-foreground">
                See you soon, {booking.patientName.split(" ")[0]}.
              </p>
            </div>
          </div>

          {/* Summary */}
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
              <span className="capitalize">
                {formatDateTime(booking.startsAt)}
              </span>

              <span className="text-muted-foreground">Patient</span>
              <span>{booking.patientName}</span>

              <span className="text-muted-foreground">Email</span>
              <span>{booking.patientEmail}</span>

              <span className="text-muted-foreground">Phone</span>
              <span>{booking.patientPhone}</span>
            </div>
          </div>

          {/* Reschedule / cancel */}
          <div className="rounded-md border border-dashed p-4 text-sm space-y-3">
            <p className="font-medium">Need to make a change?</p>
            <p className="text-muted-foreground">
              You can reschedule or cancel up to the day of your
              appointment — no phone calls needed.
            </p>
            <div className="flex flex-wrap gap-2">
              <Link
                href={`/${slug}/remarcar/${token}`}
                className={buttonVariants({ size: "sm" })}
              >
                Reschedule
              </Link>
              <Link
                href={`/${slug}/cancelar/${token}`}
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                Cancel
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
