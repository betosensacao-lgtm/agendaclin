/**
 * Inline booking status action buttons. Used in /agenda and /appointments.
 */
"use client";

import { Check, Slash, X } from "lucide-react";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";

import { updateBookingStatusAction } from "./actions";

type Status = "confirmed" | "cancelled" | "attended" | "no_show";

export function BookingActions({
  bookingId,
  status,
}: {
  bookingId: string;
  status: Status;
}) {
  const [pending, startTransition] = useTransition();

  if (status !== "confirmed") {
    return null;
  }

  function run(newStatus: "cancelled" | "attended" | "no_show", confirmMsg?: string) {
    if (confirmMsg && !confirm(confirmMsg)) return;
    startTransition(async () => {
      const result = await updateBookingStatusAction({ bookingId, newStatus });
      if (!result.ok) {
        alert(result.error);
      }
    });
  }

  return (
    <div className="flex items-center gap-1">
      <Button
        size="sm"
        variant="ghost"
        disabled={pending}
        onClick={() => run("attended")}
        title="Mark as attended"
        aria-label="Mark as attended"
      >
        <Check className="size-4" />
      </Button>
      <Button
        size="sm"
        variant="ghost"
        disabled={pending}
        onClick={() => run("no_show", "Mark as no-show (patient did not attend)?")}
        title="Mark as no-show"
        aria-label="Mark as no-show"
      >
        <Slash className="size-4" />
      </Button>
      <Button
        size="sm"
        variant="ghost"
        disabled={pending}
        onClick={() => run("cancelled", "Cancel this appointment?")}
        title="Cancel"
        aria-label="Cancel"
      >
        <X className="size-4" />
      </Button>
    </div>
  );
}

export function StatusBadge({ status }: { status: Status }) {
  const label =
    status === "confirmed"
      ? "Confirmed"
      : status === "attended"
        ? "Attended"
        : status === "cancelled"
          ? "Cancelled"
          : "No-show";

  const className =
    status === "confirmed"
      ? "border-blue-300 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300"
      : status === "attended"
        ? "border-green-300 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-300"
        : status === "cancelled"
          ? "border-muted bg-muted text-muted-foreground"
          : "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300";

  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${className}`}
    >
      {label}
    </span>
  );
}
