/**
 * Landing pública da clínica. Exibe logo, nome, contato, horários e
 * serviços ativos. Botão "Agendar consulta" leva ao wizard.
 *
 * Todos os campos novos (logo, phone, address, hoursText) são opcionais
 * e o layout se adapta — clínica sem esses dados ainda renderiza bem.
 */
import { Mail, MapPin, Clock, Phone } from "lucide-react";
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

  const hasContactInfo =
    Boolean(clinic.phone) ||
    Boolean(clinic.address) ||
    Boolean(clinic.hoursText) ||
    Boolean(clinic.contactEmail);

  return (
    <div className="space-y-8">
      {/* Cabeçalho da clínica */}
      <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
        {clinic.logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- URL externa fornecida pelo admin
          <img
            src={clinic.logoUrl}
            alt={`Logo ${clinic.name}`}
            className="size-16 shrink-0 rounded-md border bg-background object-contain p-1"
          />
        )}
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">{clinic.name}</h1>
          <p className="text-muted-foreground">
            Agende sua consulta online de forma rápida e fácil.
          </p>
        </div>
      </div>

      {/* CTA */}
      {services.length > 0 && (
        <div className="flex justify-center">
          <Link
            href={`/${slug}/agendar`}
            className={buttonVariants({ size: "lg" })}
          >
            Agendar consulta
          </Link>
        </div>
      )}

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

      {/* Contato / informações */}
      {hasContactInfo && (
        <div className="space-y-3">
          <h2 className="font-semibold">Contato e localização</h2>
          <div className="rounded-md border p-4 space-y-3 text-sm">
            {clinic.address && (
              <InfoRow icon={<MapPin className="size-4" />} label="Endereço">
                <span className="whitespace-pre-line">{clinic.address}</span>
              </InfoRow>
            )}
            {clinic.hoursText && (
              <InfoRow
                icon={<Clock className="size-4" />}
                label="Horário de funcionamento"
              >
                {clinic.hoursText}
              </InfoRow>
            )}
            {clinic.phone && (
              <InfoRow icon={<Phone className="size-4" />} label="Telefone">
                <a
                  href={`tel:${clinic.phone.replace(/\D/g, "")}`}
                  className="hover:underline"
                >
                  {clinic.phone}
                </a>
              </InfoRow>
            )}
            {clinic.contactEmail && (
              <InfoRow icon={<Mail className="size-4" />} label="E-mail">
                <a
                  href={`mailto:${clinic.contactEmail}`}
                  className="hover:underline"
                >
                  {clinic.contactEmail}
                </a>
              </InfoRow>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 text-muted-foreground" aria-hidden>
        {icon}
      </span>
      <div className="flex-1 space-y-0.5">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">
          {label}
        </div>
        <div>{children}</div>
      </div>
    </div>
  );
}
