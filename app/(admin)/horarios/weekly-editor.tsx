/**
 * Weekly availability editor. Shows 7 day cards (Sunday–Saturday),
 * each with a list of time slots editable inline.
 */
"use client";

import { Plus, X } from "lucide-react";
import { useActionState, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

import {
  saveWeeklyAvailabilityAction,
  type WeeklyAvailabilityFormState,
} from "./actions";

export type FaixaUI = {
  weekday: number;
  startTime: string; // "HH:MM" or "HH:MM:SS"
  endTime: string;
};

const DAY_LABELS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

function toHHMM(t: string): string {
  return t.length === 5 ? t : t.slice(0, 5);
}

const HOURS = Array.from({ length: 24 }, (_, h) =>
  h.toString().padStart(2, "0"),
);
const MINUTE_STEP = 15;
const MINUTES = Array.from({ length: 60 / MINUTE_STEP }, (_, i) =>
  (i * MINUTE_STEP).toString().padStart(2, "0"),
);

function TimePicker({
  value,
  onChange,
  ariaLabel,
}: {
  value: string;
  onChange: (next: string) => void;
  ariaLabel: string;
}) {
  const [h, m] = toHHMM(value).split(":");
  const minuteOptions = MINUTES.includes(m) ? MINUTES : [...MINUTES, m].sort();
  const selectClass =
    "h-8 rounded-md border bg-background px-1 text-sm tabular-nums";
  return (
    <div
      className="inline-flex items-center gap-1"
      role="group"
      aria-label={ariaLabel}
    >
      <select
        value={h}
        onChange={(e) => onChange(`${e.target.value}:${m}`)}
        className={selectClass}
        aria-label={`${ariaLabel} — hour`}
      >
        {HOURS.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
      <span className="text-muted-foreground text-xs">:</span>
      <select
        value={m}
        onChange={(e) => onChange(`${h}:${e.target.value}`)}
        className={selectClass}
        aria-label={`${ariaLabel} — minute`}
      >
        {minuteOptions.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
}

const INITIAL_STATE: WeeklyAvailabilityFormState = {};

export function WeeklyEditor({
  professionalId,
  initialFaixas,
}: {
  professionalId: string;
  initialFaixas: FaixaUI[];
}) {
  const [byWeekday, setByWeekday] = useState<Record<number, FaixaUI[]>>(() =>
    groupByWeekday(initialFaixas),
  );

  useEffect(() => {
    setByWeekday(groupByWeekday(initialFaixas));
  }, [initialFaixas, professionalId]);

  const [state, formAction, pending] = useActionState(
    saveWeeklyAvailabilityAction,
    INITIAL_STATE,
  );

  function addFaixa(weekday: number) {
    setByWeekday((prev) => ({
      ...prev,
      [weekday]: [
        ...(prev[weekday] ?? []),
        { weekday, startTime: "09:00", endTime: "12:00" },
      ],
    }));
  }

  function removeFaixa(weekday: number, idx: number) {
    setByWeekday((prev) => {
      const arr = (prev[weekday] ?? []).filter((_, i) => i !== idx);
      return { ...prev, [weekday]: arr };
    });
  }

  function updateFaixa(weekday: number, idx: number, patch: Partial<FaixaUI>) {
    setByWeekday((prev) => {
      const arr = (prev[weekday] ?? []).slice();
      arr[idx] = { ...arr[idx], ...patch };
      return { ...prev, [weekday]: arr };
    });
  }

  const allFaixas: FaixaUI[] = Array.from({ length: 7 }, (_, w) =>
    (byWeekday[w] ?? []).map((f) => ({
      weekday: w,
      startTime: toHHMM(f.startTime),
      endTime: toHHMM(f.endTime),
    })),
  ).flat();

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="professionalId" value={professionalId} />
      <input type="hidden" name="faixas" value={JSON.stringify(allFaixas)} />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {DAY_LABELS.map((label, weekday) => (
          <div key={weekday} className="rounded-md border p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="font-medium text-sm">{label}</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => addFaixa(weekday)}
                aria-label={`Add slot on ${label}`}
              >
                <Plus className="size-4" />
                Slot
              </Button>
            </div>

            {(byWeekday[weekday] ?? []).length === 0 ? (
              <p className="text-xs text-muted-foreground">No availability.</p>
            ) : (
              <div className="space-y-2">
                {(byWeekday[weekday] ?? []).map((faixa, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <TimePicker
                      value={faixa.startTime}
                      onChange={(next) =>
                        updateFaixa(weekday, idx, { startTime: next })
                      }
                      ariaLabel="Start"
                    />
                    <span className="text-muted-foreground text-xs">to</span>
                    <TimePicker
                      value={faixa.endTime}
                      onChange={(next) =>
                        updateFaixa(weekday, idx, { endTime: next })
                      }
                      ariaLabel="End"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeFaixa(weekday, idx)}
                      aria-label="Remove slot"
                    >
                      <X className="size-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm">
          {state.error && (
            <span className="text-destructive" role="alert">
              {state.error}
            </span>
          )}
          {state.ok && (
            <span className="text-muted-foreground">
              Saved at {new Date().toLocaleTimeString("en-US")}.
            </span>
          )}
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving..." : "Save schedule"}
        </Button>
      </div>
    </form>
  );
}

function groupByWeekday(faixas: FaixaUI[]): Record<number, FaixaUI[]> {
  const out: Record<number, FaixaUI[]> = {};
  for (let w = 0; w < 7; w++) out[w] = [];
  for (const f of faixas) {
    (out[f.weekday] ??= []).push(f);
  }
  return out;
}
