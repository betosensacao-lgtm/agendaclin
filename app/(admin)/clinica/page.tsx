/**
 * Tela de configurações da clínica. Server Component carrega os dados
 * atuais e passa para o ClinicForm (client).
 */
import { notFound } from "next/navigation";

import { requireRole } from "@/lib/auth/guards";
import { getClinicById } from "@/lib/db/queries/clinics";

import { ClinicForm } from "./clinic-form";

export default async function ClinicaPage() {
  const user = await requireRole("admin");
  const clinic = await getClinicById(user.clinicId);
  if (!clinic) notFound();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Clinic settings</h1>
        <p className="text-sm text-muted-foreground">
          Data displayed on your public page (
          <a
            href={`/${clinic.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-foreground"
          >
            /{clinic.slug}
          </a>
          ) e usados em emails ao paciente.
        </p>
      </div>

      <ClinicForm clinic={clinic} />
    </div>
  );
}
