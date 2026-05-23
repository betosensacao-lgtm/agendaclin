/**
 * Wizard de onboarding pra clínicas novas. Lista 5 passos com status
 * (✓ done / ○ pendente) e links pra cada tela correspondente.
 *
 * Não bloqueia — admin pode pular pro /agenda a qualquer momento.
 * Layout admin marca essa página como "pendente" se onboarding_completed=false.
 */
import { Check, Circle, ExternalLink } from "lucide-react";
import Link from "next/link";

import { Button, buttonVariants } from "@/components/ui/button";
import { requireRole } from "@/lib/auth/guards";
import {
  getClinicById,
  getOnboardingStatus,
} from "@/lib/db/queries/clinics";

import { completeOnboardingAction } from "./actions";

export default async function OnboardingPage() {
  const user = await requireRole("admin");
  const [clinic, status] = await Promise.all([
    getClinicById(user.clinicId),
    getOnboardingStatus(user.clinicId),
  ]);

  if (!clinic) {
    // Inconsistência improvável (admin sem clínica), mas defensivo.
    return null;
  }

  const steps: Array<{
    n: number;
    title: string;
    description: string;
    href: string;
    done: boolean;
  }> = [
    {
      n: 1,
      title: "Dados da clínica",
      description:
        "Telefone, endereço e horário de funcionamento — aparecem na sua página pública.",
      href: "/clinica",
      done: status.clinicConfigured,
    },
    {
      n: 2,
      title: "Cadastre serviços",
      description: "Ex.: Limpeza, avaliação, restauração — com duração e preço.",
      href: "/servicos",
      done: status.hasService,
    },
    {
      n: 3,
      title: "Cadastre profissionais",
      description: "Quem atende cada serviço.",
      href: "/profissionais",
      done: status.hasProfessional,
    },
    {
      n: 4,
      title: "Configure horários",
      description: "Faixas de atendimento por dia da semana + bloqueios pontuais.",
      href: "/horarios",
      done: status.hasWeeklyAvailability,
    },
    {
      n: 5,
      title: "Compartilhe seu link",
      description: "Mande pro WhatsApp dos pacientes, coloca no Instagram, no site…",
      href: `/${clinic.slug}`,
      done: false, // este passo é manual — não temos como detectar
    },
  ];

  const completedCount = steps.filter((s) => s.done).length;
  const allRequiredDone = steps.slice(0, 4).every((s) => s.done);

  const publicUrl = clinic.slug
    ? `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/${clinic.slug}`
    : "";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Bem-vindo, {clinic.name}!
        </h1>
        <p className="text-sm text-muted-foreground">
          Em alguns minutos sua clínica está pronta pra receber agendamentos.
        </p>
      </div>

      {/* Progresso */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">
            {completedCount} de {steps.length} passos
          </span>
          <span className="text-muted-foreground">
            {Math.round((completedCount / steps.length) * 100)}%
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${(completedCount / steps.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Passos */}
      <ol className="space-y-3">
        {steps.map((step) => (
          <li
            key={step.n}
            className="flex gap-4 rounded-md border p-4 transition-colors hover:bg-accent/30"
          >
            <div className="mt-0.5 shrink-0">
              {step.done ? (
                <div className="flex size-7 items-center justify-center rounded-full bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                  <Check className="size-4" />
                </div>
              ) : (
                <div className="flex size-7 items-center justify-center rounded-full border bg-muted text-muted-foreground">
                  <Circle className="size-4" />
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="font-medium">
                  {step.n}. {step.title}
                </h2>
                <Link
                  href={step.href}
                  className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                  target={step.n === 5 ? "_blank" : undefined}
                  rel={step.n === 5 ? "noopener noreferrer" : undefined}
                >
                  {step.done ? "Revisar" : "Configurar"}
                  {step.n === 5 && <ExternalLink className="size-3" />}
                </Link>
              </div>
              <p className="text-sm text-muted-foreground">{step.description}</p>
              {step.n === 5 && publicUrl && (
                <p className="mt-2 break-all text-xs font-mono text-muted-foreground">
                  {publicUrl}
                </p>
              )}
            </div>
          </li>
        ))}
      </ol>

      {/* Conclusão */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-muted/30 p-4">
        <div className="text-sm">
          {allRequiredDone ? (
            <span className="font-medium">
              Pronto pra receber agendamentos! 🎉
            </span>
          ) : (
            <span className="text-muted-foreground">
              Complete os passos 1-4 pra ativar agendamentos.
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <Link
            href="/agenda"
            className={buttonVariants({ variant: "ghost" })}
          >
            Pular por agora
          </Link>
          <form action={completeOnboardingAction}>
            <Button type="submit" disabled={!allRequiredDone}>
              Concluir onboarding
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
