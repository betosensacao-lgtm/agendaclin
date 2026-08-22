/**
 * Public reschedule page. Shows current booking details and a slot grid
 * to pick a new time (same service, same provider).
 */
import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { withTenant } from "@/lib/db/tenant";
import { getBookingByToken } from "@/lib/db/queries/bookings";
import { getClinicBySlug } from "@/lib/db/queries/clinics";
import { formatDuration } from "@/lib/format";

import { RescheduleForm } from "./reschedule-form";

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

export default async function RemarcarPage({
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
            longer be rescheduled.
          </p>
        </div>
        <Link
          href={`/${slug}/agendar`}
          className={buttonVariants({ variant: "outline" })}
        >
          Book new appointment
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 px-4 py-8">
      <div>
        <h1 className="text-xl font-bold">Reschedule booking</h1>
        <p className="text-sm text-muted-foreground">
          Choose a new time with {booking.professional.name}.
        </p>
      </div>

      {/* Current booking summary */}
      <div className="rounded-md border bg-muted/30 p-4 text-sm space-y-2">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          Current booking
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
        ← Back
      </Link>
    </div>
  );
}
