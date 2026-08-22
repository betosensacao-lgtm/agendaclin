/**
 * Onboarding wizard for new clinics. Lists 5 steps with status
 * (✓ done / ○ pending) and links to each corresponding screen.
 */
import { Check, Circle, ExternalLink } from "lucide-react";
import Link from "next/link";

import { Button, buttonVariants } from "@/components/ui/button";
import { requireRole } from "@/lib/auth/guards";
import { withTenant } from "@/lib/db/tenant";
import {
  getClinicById,
  getOnboardingStatus,
} from "@/lib/db/queries/clinics";

import { completeOnboardingAction } from "./actions";

export default async function OnboardingPage() {
  const user = await requireRole("admin");
  const [clinic, status] = await withTenant(user.clinicId, (tx) =>
    Promise.all([
      getClinicById(tx, user.clinicId),
      getOnboardingStatus(tx, user.clinicId),
    ]),
  );

  if (!clinic) return null;

  const steps: Array<{
    n: number;
    title: string;
    description: string;
    href: string;
    done: boolean;
  }> = [
    {
      n: 1,
      title: "Clinic details",
      description:
        "Phone, address and business hours — displayed on your public page.",
      href: "/clinica",
      done: status.clinicConfigured,
    },
    {
      n: 2,
      title: "Add services",
      description: "e.g. Cleaning, consultation, treatment — with duration and price.",
      href: "/servicos",
      done: status.hasService,
    },
    {
      n: 3,
      title: "Add providers",
      description: "Who attends each service.",
      href: "/profissionais",
      done: status.hasProfessional,
    },
    {
      n: 4,
      title: "Set availability",
      description: "Weekly schedule per provider + specific time blocks.",
      href: "/horarios",
      done: status.hasWeeklyAvailability,
    },
    {
      n: 5,
      title: "Share your link",
      description: "Send it to patients, post on Instagram, add to your website…",
      href: `/${clinic.slug}`,
      done: false,
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
          Welcome, {clinic.name}!
        </h1>
        <p className="text-sm text-muted-foreground">
          In just a few minutes your clinic will be ready to receive bookings.
        </p>
      </div>

      {/* Progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">
            {completedCount} of {steps.length} steps
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

      {/* Steps */}
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
                  {step.done ? "Review" : "Set up"}
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

      {/* Completion */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-muted/30 p-4">
        <div className="text-sm">
          {allRequiredDone ? (
            <span className="font-medium">
              Ready to receive bookings! 🎉
            </span>
          ) : (
            <span className="text-muted-foreground">
              Complete steps 1–4 to activate bookings.
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <Link
            href="/agenda"
            className={buttonVariants({ variant: "ghost" })}
          >
            Skip for now
          </Link>
          <form action={completeOnboardingAction}>
            <Button type="submit" disabled={!allRequiredDone}>
              Complete setup
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
