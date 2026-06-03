/**
 * Availability panel: provider selector + weekly editor + time blocks.
 */
"use client";

import { useRouter, useSearchParams } from "next/navigation";

import { WeeklyEditor, type FaixaUI } from "./weekly-editor";
import { OverridesSection, type OverrideRow } from "./overrides-section";

type ProfessionalSummary = { id: string; name: string };

export function HorariosPanel({
  professionals,
  selectedProfessionalId,
  weeklyAvailability,
  overrides,
}: {
  professionals: ProfessionalSummary[];
  selectedProfessionalId: string | null;
  weeklyAvailability: FaixaUI[];
  overrides: OverrideRow[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function handleSelectProfessional(id: string) {
    const params = new URLSearchParams(searchParams);
    params.set("prof", id);
    router.push(`/horarios?${params.toString()}`);
  }

  if (professionals.length === 0) {
    return (
      <div className="rounded-md border p-6 text-sm text-muted-foreground">
        No active providers. Add providers before configuring availability.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <div className="flex items-center gap-3">
          <label htmlFor="prof-select" className="text-sm font-medium">
            Provider
          </label>
          <select
            id="prof-select"
            className="h-9 rounded-md border bg-background px-3 text-sm shadow-xs outline-none focus-visible:ring-1 focus-visible:ring-ring"
            value={selectedProfessionalId ?? ""}
            onChange={(e) => handleSelectProfessional(e.target.value)}
          >
            {professionals.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        {selectedProfessionalId && (
          <WeeklyEditor
            professionalId={selectedProfessionalId}
            initialFaixas={weeklyAvailability}
          />
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-medium">Time blocks</h2>
            <p className="text-sm text-muted-foreground">
              Holidays, events and specific exceptions. Apply to a single
              provider or the entire clinic.
            </p>
          </div>
        </div>
        <OverridesSection
          professionals={professionals}
          overrides={overrides}
        />
      </section>
    </div>
  );
}
