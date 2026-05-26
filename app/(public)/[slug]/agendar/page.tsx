/**
 * Página de agendamento. Server Component responsável por carregar
 * os dados iniciais (serviços e profissionais por serviço) e passar
 * pro BookingWizard (Client Component).
 */
import { notFound } from "next/navigation";

import {
  getClinicBySlug,
  getPublicProfessionalsByService,
  getPublicServices,
} from "@/lib/db/queries/clinics";

import { BookingWizard } from "./booking-wizard";

export default async function AgendarPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const clinic = await getClinicBySlug(slug);
  if (!clinic) notFound();

  const services = await getPublicServices(clinic.id);

  // Pré-carrega profissionais por serviço (tipicamente 1-3 profissionais,
  // sem impacto de N+1 relevante no MVP).
  const professionalsByService: Record<
    string,
    { id: string; name: string }[]
  > = {};
  await Promise.all(
    services.map(async (svc) => {
      professionalsByService[svc.id] = await getPublicProfessionalsByService(
        clinic.id,
        svc.id,
      );
    }),
  );

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 px-4 py-8">
      <div>
        <p className="text-sm text-muted-foreground">{clinic.name}</p>
        <h1 className="text-xl font-bold">Agendar consulta</h1>
      </div>

      {services.length === 0 ? (
        <p className="rounded-md border p-6 text-center text-sm text-muted-foreground">
          Nenhum serviço disponível no momento. Entre em contato com a clínica.
        </p>
      ) : (
        <BookingWizard
          clinic={{
            id: clinic.id,
            name: clinic.name,
            slug: clinic.slug,
            timezone: clinic.timezone,
          }}
          services={services}
          professionalsByService={professionalsByService}
        />
      )}
    </div>
  );
}
