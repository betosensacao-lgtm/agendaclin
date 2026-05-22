/**
 * Botões inline para mudar o status de um booking. Usado tanto na /agenda
 * quanto na /consultas. Confirma destrutivas (cancelar) via window.confirm.
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

  // Booking já finalizado (não-confirmed) não pode mais ser alterado pela UI.
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
        title="Marcar como atendido"
        aria-label="Marcar como atendido"
      >
        <Check className="size-4" />
      </Button>
      <Button
        size="sm"
        variant="ghost"
        disabled={pending}
        onClick={() => run("no_show", "Marcar como falta (paciente não compareceu)?")}
        title="Marcar como falta"
        aria-label="Marcar como falta"
      >
        <Slash className="size-4" />
      </Button>
      <Button
        size="sm"
        variant="ghost"
        disabled={pending}
        onClick={() => run("cancelled", "Cancelar esta consulta?")}
        title="Cancelar"
        aria-label="Cancelar"
      >
        <X className="size-4" />
      </Button>
    </div>
  );
}

/**
 * Badge com o status traduzido + cor. Usado em /agenda e /consultas.
 */
export function StatusBadge({ status }: { status: Status }) {
  const label =
    status === "confirmed"
      ? "Confirmada"
      : status === "attended"
        ? "Atendida"
        : status === "cancelled"
          ? "Cancelada"
          : "Falta";

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
