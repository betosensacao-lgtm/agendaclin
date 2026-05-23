/**
 * Client component que mostra date picker + grid de slots disponíveis
 * pra remarcação. Reaproveita lógica do wizard de agendamento, mas
 * sem precisar selecionar serviço/profissional (já vêm do booking).
 */
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  getSlotsForRescheduleAction,
  rescheduleBookingAction,
  type SlotResult,
} from "./actions";

function formatSlotTime(isoUtc: string, timezone: string): string {
  return new Date(isoUtc).toLocaleTimeString("pt-BR", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function formatDateLabel(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function todayYMD(): string {
  return new Date().toLocaleDateString("en-CA");
}

function maxDateYMD(): string {
  const d = new Date();
  d.setDate(d.getDate() + 90);
  return d.toLocaleDateString("en-CA");
}

export function RescheduleForm({
  clinic,
  cancelToken,
  currentStartsAt,
}: {
  clinic: { slug: string; timezone: string };
  cancelToken: string;
  currentStartsAt: string;
}) {
  const router = useRouter();

  const [selectedDate, setSelectedDate] = useState(todayYMD);
  const [slots, setSlots] = useState<SlotResult[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [submittingSlot, setSubmittingSlot] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSlotsLoading(true);
    setSlots([]);
    setError(null);

    getSlotsForRescheduleAction({
      clinicSlug: clinic.slug,
      cancelToken,
      dateLocal: selectedDate,
      timezone: clinic.timezone,
    })
      .then(setSlots)
      .catch((err) => {
        console.error(err);
        setError("Erro ao carregar horários.");
      })
      .finally(() => setSlotsLoading(false));
  }, [clinic.slug, clinic.timezone, cancelToken, selectedDate]);

  async function handleSelectSlot(slot: SlotResult) {
    if (submittingSlot) return;
    setSubmittingSlot(slot.startsAt);
    setError(null);

    const result = await rescheduleBookingAction({
      clinicSlug: clinic.slug,
      cancelToken,
      newStartsAt: slot.startsAt,
    });

    if (result.ok) {
      router.push(`/${clinic.slug}/confirmado/${cancelToken}`);
      router.refresh();
    } else {
      setError(result.error);
      setSubmittingSlot(null);
      // Recarrega slots — slot pode ter ficado ocupado.
      const fresh = await getSlotsForRescheduleAction({
        clinicSlug: clinic.slug,
        cancelToken,
        dateLocal: selectedDate,
        timezone: clinic.timezone,
      });
      setSlots(fresh);
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="date">Nova data</Label>
        <Input
          id="date"
          type="date"
          value={selectedDate}
          min={todayYMD()}
          max={maxDateYMD()}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="w-full max-w-xs"
        />
        {selectedDate && (
          <p className="text-xs text-muted-foreground capitalize">
            {formatDateLabel(selectedDate)}
          </p>
        )}
      </div>

      {slotsLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          Buscando horários…
        </div>
      ) : slots.length === 0 ? (
        <p className="rounded-md border p-4 text-center text-sm text-muted-foreground">
          Nenhum horário disponível neste dia. Tente outra data.
        </p>
      ) : (
        <div>
          <p className="mb-2 text-sm text-muted-foreground">
            {slots.length} horário{slots.length !== 1 ? "s" : ""} disponível
            {slots.length !== 1 ? "s" : ""}
          </p>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {slots.map((slot) => {
              // Comparar por timestamp (number) é mais robusto que comparar
              // strings ISO, que podem diferir em millis ou formato.
              const currentTs = new Date(currentStartsAt).getTime();
              const slotTs = new Date(slot.startsAt).getTime();
              const isCurrent = slotTs === currentTs;
              const isSubmitting = submittingSlot === slot.startsAt;
              return (
                <Button
                  key={slot.startsAt}
                  type="button"
                  variant={isCurrent ? "secondary" : "outline"}
                  disabled={isCurrent || submittingSlot !== null}
                  onClick={() => handleSelectSlot(slot)}
                  className="font-mono tabular-nums"
                  title={isCurrent ? "Horário atual" : undefined}
                >
                  {isSubmitting
                    ? "..."
                    : formatSlotTime(slot.startsAt, clinic.timezone)}
                </Button>
              );
            })}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Clique num horário pra confirmar a remarcação. O horário atual
            aparece em cinza e não pode ser selecionado novamente.
          </p>
        </div>
      )}

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
