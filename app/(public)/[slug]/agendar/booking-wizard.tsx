/**
 * Wizard de agendamento público (client component).
 * 4 steps: serviço → profissional → data/slot → dados do paciente.
 *
 * Estado mantido localmente; slots são buscados via Server Action quando
 * o usuário troca de data ou avança para o step 3.
 */
"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TurnstileWidget } from "@/components/turnstile-widget";
import { cn } from "@/lib/utils";
import { formatDuration, formatPriceCents } from "@/lib/format";

import {
  createBookingAction,
  getAvailableSlotsAction,
  type SlotResult,
} from "./actions";

// ---- Tipos ----

type Service = {
  id: string;
  name: string;
  durationMinutes: number;
  priceCents: number | null;
};

type Professional = { id: string; name: string };

type WizardStep = 1 | 2 | 3 | 4;

const STEP_LABELS: Record<WizardStep, string> = {
  1: "Serviço",
  2: "Profissional",
  3: "Horário",
  4: "Seus dados",
};

// ---- Helpers ----

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
  // en-CA retorna YYYY-MM-DD no fuso local do browser.
  return new Date().toLocaleDateString("en-CA");
}

function maxDateYMD(): string {
  const d = new Date();
  d.setDate(d.getDate() + 90);
  return d.toLocaleDateString("en-CA");
}

// ---- Sub-componentes ----

function StepIndicator({
  current,
  total,
}: {
  current: WizardStep;
  total: number;
}) {
  return (
    <div className="space-y-1">
      <div className="flex gap-1">
        {Array.from({ length: total }, (_, i) => (
          <div
            key={i}
            className={cn(
              "h-1.5 flex-1 rounded-full transition-colors",
              i + 1 <= current ? "bg-primary" : "bg-muted",
            )}
          />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Passo {current} de {total} — {STEP_LABELS[current]}
      </p>
    </div>
  );
}

// ---- Wizard principal ----

export function BookingWizard({
  clinic,
  services,
  professionalsByService,
}: {
  clinic: {
    id: string;
    name: string;
    slug: string;
    timezone: string;
  };
  services: Service[];
  professionalsByService: Record<string, Professional[]>;
}) {
  const router = useRouter();

  // Wizard state
  const [step, setStep] = useState<WizardStep>(1);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedProfessional, setSelectedProfessional] =
    useState<Professional | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<SlotResult | null>(null);

  // Step 3: date + slots
  const [selectedDate, setSelectedDate] = useState(todayYMD);
  const [slots, setSlots] = useState<SlotResult[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);

  // Step 4: patient form
  const [patientName, setPatientName] = useState("");
  const [patientPhone, setPatientPhone] = useState("");
  const [patientEmail, setPatientEmail] = useState("");
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileKey, setTurnstileKey] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Carrega slots quando entra no step 3 ou muda de data.
  useEffect(() => {
    if (step !== 3 || !selectedProfessional || !selectedService) return;

    setSlotsLoading(true);
    setSlots([]);
    setSelectedSlot(null);

    getAvailableSlotsAction({
      clinicId: clinic.id,
      professionalId: selectedProfessional.id,
      serviceId: selectedService.id,
      dateLocal: selectedDate,
      timezone: clinic.timezone,
    })
      .then(setSlots)
      .catch(console.error)
      .finally(() => setSlotsLoading(false));
  }, [step, selectedDate, selectedProfessional, selectedService, clinic]);

  // Handlers de seleção
  function handleSelectService(service: Service) {
    setSelectedService(service);
    setSelectedProfessional(null);
    setSelectedSlot(null);

    const pros = professionalsByService[service.id] ?? [];
    if (pros.length === 1) {
      // Só um profissional → pula o step de seleção.
      setSelectedProfessional(pros[0]);
      setStep(3);
    } else {
      setStep(2);
    }
  }

  function handleSelectProfessional(pro: Professional) {
    setSelectedProfessional(pro);
    setSelectedSlot(null);
    setStep(3);
  }

  function handleSelectSlot(slot: SlotResult) {
    setSelectedSlot(slot);
    setStep(4);
  }

  function handleBack() {
    if (step === 4) {
      setStep(3);
      return;
    }
    if (step === 3) {
      const pros =
        selectedService ? (professionalsByService[selectedService.id] ?? []) : [];
      // Se pulamos o step 2 (1 profissional), volta pro step 1.
      setStep(pros.length === 1 ? 1 : 2);
      return;
    }
    if (step === 2) {
      setStep(1);
      return;
    }
  }

  // Stable callback para o Turnstile (evita remount desnecessário).
  const handleTurnstileVerify = useCallback((token: string) => {
    setTurnstileToken(token);
  }, []);

  // Submissão
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedService || !selectedProfessional || !selectedSlot || !turnstileToken)
      return;

    setSubmitting(true);
    setSubmitError(null);

    const result = await createBookingAction({
      clinicSlug: clinic.slug,
      professionalId: selectedProfessional.id,
      serviceId: selectedService.id,
      startsAt: selectedSlot.startsAt,
      patientName,
      patientPhone,
      patientEmail,
      turnstileToken,
    });

    if (result.ok) {
      router.push(`/${clinic.slug}/confirmado/${result.cancelToken}`);
      return;
    }

    setSubmitError(result.error);
    setTurnstileToken(null);
    setTurnstileKey((k) => k + 1); // remonta o widget pra nova verificação
    setSubmitting(false);
  }

  const professionals =
    selectedService ? (professionalsByService[selectedService.id] ?? []) : [];

  return (
    <div className="space-y-6">
      <StepIndicator current={step} total={4} />

      {/* STEP 1 — Serviço */}
      {step === 1 && (
        <div className="space-y-4">
          <h2 className="font-semibold">Escolha o serviço</h2>
          {services.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum serviço disponível no momento.
            </p>
          ) : (
            <div className="grid gap-3">
              {services.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => handleSelectService(s)}
                  className="rounded-md border p-4 text-left transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div className="font-medium">{s.name}</div>
                  <div className="mt-1 flex gap-3 text-sm text-muted-foreground">
                    <span>{formatDuration(s.durationMinutes)}</span>
                    {s.priceCents != null && (
                      <span>{formatPriceCents(s.priceCents)}</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* STEP 2 — Profissional */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleBack}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              ← Voltar
            </button>
            <h2 className="font-semibold">Escolha o profissional</h2>
          </div>

          {professionals.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum profissional disponível para este serviço.
            </p>
          ) : (
            <div className="grid gap-3">
              {professionals.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleSelectProfessional(p)}
                  className="rounded-md border p-4 text-left font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {p.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* STEP 3 — Data e horário */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleBack}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              ← Voltar
            </button>
            <h2 className="font-semibold">Escolha o horário</h2>
          </div>

          <div className="space-y-1">
            <Label htmlFor="date">Data</Label>
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
                {slots.map((slot) => (
                  <button
                    key={slot.startsAt}
                    type="button"
                    onClick={() => handleSelectSlot(slot)}
                    className="rounded-md border px-3 py-2 text-sm font-medium transition-colors hover:bg-primary hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {formatSlotTime(slot.startsAt, clinic.timezone)}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* STEP 4 — Dados do paciente */}
      {step === 4 && selectedSlot && selectedService && selectedProfessional && (
        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleBack}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              ← Voltar
            </button>
            <h2 className="font-semibold">Seus dados</h2>
          </div>

          {/* Resumo da consulta */}
          <div className="rounded-md border bg-muted/40 p-4 text-sm space-y-1">
            <p>
              <span className="font-medium">{selectedService.name}</span>
              {" com "}
              <span className="font-medium">{selectedProfessional.name}</span>
            </p>
            <p className="text-muted-foreground">
              {formatDateLabel(selectedDate)} às{" "}
              {formatSlotTime(selectedSlot.startsAt, clinic.timezone)}
              {" "}({formatDuration(selectedService.durationMinutes)})
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="patientName">Nome completo *</Label>
              <Input
                id="patientName"
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                required
                minLength={2}
                maxLength={100}
                placeholder="Seu nome"
                autoComplete="name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="patientPhone">Telefone / WhatsApp *</Label>
              <Input
                id="patientPhone"
                type="tel"
                value={patientPhone}
                onChange={(e) => setPatientPhone(e.target.value)}
                required
                minLength={8}
                maxLength={20}
                placeholder="(11) 91234-5678"
                autoComplete="tel"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="patientEmail">E-mail *</Label>
              <Input
                id="patientEmail"
                type="email"
                value={patientEmail}
                onChange={(e) => setPatientEmail(e.target.value)}
                required
                placeholder="seu@email.com"
                autoComplete="email"
              />
            </div>

            {/* Turnstile — renderiza apenas quando os dados estão preenchidos */}
            <div>
              <TurnstileWidget
                key={turnstileKey}
                siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? ""}
                onVerify={handleTurnstileVerify}
              />
            </div>

            {submitError && (
              <p className="text-sm text-destructive" role="alert">
                {submitError}
              </p>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={submitting || !turnstileToken}
            >
              {submitting
                ? "Confirmando…"
                : !turnstileToken
                  ? "Aguardando verificação…"
                  : "Confirmar agendamento"}
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}
