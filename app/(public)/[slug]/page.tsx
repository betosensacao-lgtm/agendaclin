/**
 * Landing pública da clínica — design moderno "Warm Professional".
 *
 * Hero com gradiente escuro (full-bleed dentro do layout),
 * cards de serviço clicáveis com hover, seção de contato clean.
 */
import { Calendar, Clock, Mail, MapPin, Phone } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { getPublicServices, getClinicBySlug } from "@/lib/db/queries/clinics";
import { formatDuration, formatPriceCents } from "@/lib/format";
import { cn } from "@/lib/utils";

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
    <div>
      {/* ── Hero (full-bleed) ── */}
      <div className="-mx-4 -mt-8 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 px-6 pb-10 pt-10 text-white">
        {/* Logo + nome */}
        <div className="mb-6 flex items-center gap-4">
          {clinic.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={clinic.logoUrl}
              alt={`Logo ${clinic.name}`}
              className="size-14 shrink-0 rounded-xl border border-white/20 bg-white/10 object-contain p-1.5"
            />
          ) : (
            <div className="flex size-14 shrink-0 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-xl font-bold">
              {clinic.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold leading-tight">{clinic.name}</h1>
            <p className="text-sm text-slate-400">Agendamento online</p>
          </div>
        </div>

        {/* Headline */}
        <p className="mb-6 max-w-sm text-base text-slate-300">
          Agende sua consulta em minutos, sem precisar ligar.
        </p>

        {/* CTA */}
        {services.length > 0 && (
          <div className="flex items-center gap-4">
            <Link
              href={`/${slug}/agendar`}
              className={cn(
                buttonVariants({ size: "lg" }),
                "bg-white text-slate-900 hover:bg-slate-100",
              )}
            >
              <Calendar className="mr-2 size-4" />
              Agendar consulta
            </Link>
            <span className="text-sm text-slate-400">
              {services.length} serviço{services.length !== 1 ? "s" : ""}
            </span>
          </div>
        )}
      </div>

      {/* ── Corpo ── */}
      <div className="mt-8 space-y-10">
        {/* Serviços */}
        <section className="space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Serviços disponíveis
          </h2>

          {services.length === 0 ? (
            <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
              Nenhum serviço disponível no momento. Entre em contato com a
              clínica.
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {services.map((service) => (
                <Link
                  key={service.id}
                  href={`/${slug}/agendar`}
                  className="group flex items-start gap-4 rounded-xl border bg-card p-4 transition-all duration-150 hover:border-slate-400 hover:shadow-md"
                >
                  <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 transition-colors group-hover:bg-slate-900 group-hover:text-white">
                    <Calendar className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <p className="font-medium leading-snug">{service.name}</p>
                    <div className="flex flex-wrap gap-1.5">
                      <Badge
                        variant="secondary"
                        className="gap-1 text-xs font-normal"
                      >
                        <Clock className="size-3" />
                        {formatDuration(service.durationMinutes)}
                      </Badge>
                      {service.priceCents != null && (
                        <Badge
                          variant="outline"
                          className="text-xs font-normal"
                        >
                          {formatPriceCents(service.priceCents)}
                        </Badge>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Contato */}
        {hasContactInfo && (
          <section className="space-y-4">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Contato e localização
            </h2>
            <div className="overflow-hidden rounded-xl border divide-y">
              {clinic.address && (
                <ContactRow icon={<MapPin className="size-4" />} label="Endereço">
                  <span className="whitespace-pre-line">{clinic.address}</span>
                </ContactRow>
              )}
              {clinic.hoursText && (
                <ContactRow icon={<Clock className="size-4" />} label="Horário">
                  {clinic.hoursText}
                </ContactRow>
              )}
              {clinic.phone && (
                <ContactRow icon={<Phone className="size-4" />} label="Telefone">
                  <a
                    href={`tel:${clinic.phone.replace(/\D/g, "")}`}
                    className="text-blue-600 hover:underline"
                  >
                    {clinic.phone}
                  </a>
                </ContactRow>
              )}
              {clinic.contactEmail && (
                <ContactRow icon={<Mail className="size-4" />} label="E-mail">
                  <a
                    href={`mailto:${clinic.contactEmail}`}
                    className="text-blue-600 hover:underline"
                  >
                    {clinic.contactEmail}
                  </a>
                </ContactRow>
              )}
            </div>
          </section>
        )}

        {/* CTA repetido no final (se houver serviços) */}
        {services.length > 0 && (
          <div className="rounded-xl bg-slate-50 p-6 text-center dark:bg-slate-900/40">
            <p className="mb-4 text-sm text-muted-foreground">
              Pronto para agendar? É rápido e sem precisar ligar.
            </p>
            <Link
              href={`/${slug}/agendar`}
              className={buttonVariants({ size: "lg" })}
            >
              <Calendar className="mr-2 size-4" />
              Agendar consulta
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Componente auxiliar ──

function ContactRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-4 bg-card px-4 py-3.5">
      <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
        {icon}
      </div>
      <div className="flex-1 space-y-0.5">
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </div>
        <div className="text-sm">{children}</div>
      </div>
    </div>
  );
}
