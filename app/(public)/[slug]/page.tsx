/**
 * Landing pública da clínica. Exibe nome, serviços ativos e um botão
 * para iniciar o agendamento.
 */
import Link from "next/link";
import { notFound } from "next/navigation";

import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatDuration, formatPriceCents } from "@/lib/format";
import {
  getClinicBySlug,
  getPublicServices,
} from "@/lib/db/queries/clinics";

export default async function ClinicLandingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const clinic = await getClinicBySlug(slug);
  if (!clinic) notFound();

  const services = await getPublicServices(clinic.id);

  return (
    <div className="space-y-8">
      {/* Cabeçalho da clínica */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">{clinic.name}</h1>
        <p className="text-muted-foreground">
          Agende sua consulta online de forma rápida e fácil.
        </p>
      </div>

      {/* Serviços disponíveis */}
      {services.length === 0 ? (
        <p className="rounded-md border p-6 text-center text-sm text-muted-foreground">
          Nenhum serviço disponível no momento. Entre em contato com a clínica.
        </p>
      ) : (
        <div className="space-y-3">
          <h2 className="font-semibold">Serviços disponíveis</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {services.map((service) => (
              <Card key={service.id} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{service.name}</CardTitle>
                  <CardDescription className="flex flex-wrap gap-3 text-xs">
                    <span>{formatDuration(service.durationMinutes)}</span>
                    {service.priceCents != null && (
                      <span>{formatPriceCents(service.priceCents)}</span>
                    )}
                  </CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* CTA */}
      {services.length > 0 && (
        <div className="flex justify-center pt-2">
          <Link href={`/${slug}/agendar`} className={buttonVariants({ size: "lg" })}>
            Agendar consulta
          </Link>
        </div>
      )}
    </div>
  );
}
