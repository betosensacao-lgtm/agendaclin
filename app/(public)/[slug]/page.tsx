/**
 * Landing pública da clínica — design premium, mobile-first, focado em conversão.
 *
 * Paleta:
 *   - Background: #FAFAFA (off-white)
 *   - Texto principal: #1F2937 (slate-800)
 *   - Primária: rose-600 (sofisticada, comum em estética)
 *   - Fonte: Inter (next/font, scoped a este componente)
 *
 * Estrutura:
 *   1. Header minimalista (logo + CTA pequeno)
 *   2. Hero (texto à esquerda, visual decorativo à direita em lg)
 *   3. Banner de Pré-avaliação Inteligente (sobreposto ao hero)
 *   4. Grid de serviços (cards premium com badge de duração/preço e CTA próprio)
 *   5. Contato (grid com ícones lucide)
 *   6. CTA final em destaque (gradient rose)
 */
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  Sparkles,
  Stethoscope,
} from "lucide-react";
import { Inter } from "next/font/google";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { getPublicServices, getClinicBySlug } from "@/lib/db/queries/clinics";
import { formatDuration, formatPriceCents } from "@/lib/format";
import { cn } from "@/lib/utils";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

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

  const initial = clinic.name.charAt(0).toUpperCase();
  const agendarHref = `/${slug}/agendar`;

  return (
    <div className={cn(inter.className, "text-[#1F2937]")}>
      {/* ───────────────── HEADER ───────────────── */}
      <header className="border-b border-slate-200/70 bg-white/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 lg:px-8">
          <div className="flex items-center gap-3">
            {clinic.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={clinic.logoUrl}
                alt={`Logo ${clinic.name}`}
                className="size-9 shrink-0 rounded-lg border border-slate-200 bg-white object-contain p-1"
              />
            ) : (
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-rose-500 to-rose-600 text-sm font-semibold text-white shadow-sm">
                {initial}
              </div>
            )}
            <span className="font-semibold tracking-tight">{clinic.name}</span>
          </div>
          {services.length > 0 && (
            <Link
              href={agendarHref}
              className="inline-flex h-9 items-center gap-1.5 rounded-full bg-rose-600 px-4 text-sm font-medium text-white shadow-sm transition hover:bg-rose-700"
            >
              Agendar
              <ArrowRight className="size-3.5" />
            </Link>
          )}
        </div>
      </header>

      {/* ───────────────── HERO ───────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-rose-50/60 via-[#FAFAFA] to-[#FAFAFA]">
        {/* Soft decorative shapes */}
        <div className="pointer-events-none absolute -right-32 -top-32 size-96 rounded-full bg-rose-200/30 blur-3xl" />
        <div className="pointer-events-none absolute -left-24 top-40 size-72 rounded-full bg-pink-200/20 blur-3xl" />

        <div className="relative mx-auto grid max-w-6xl gap-12 px-4 py-16 lg:grid-cols-2 lg:gap-16 lg:px-8 lg:py-24">
          {/* Coluna esquerda: copy */}
          <div className="flex flex-col justify-center space-y-7">
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-rose-200/70 bg-rose-50 px-3 py-1 text-xs font-medium text-rose-700">
              <Sparkles className="size-3" />
              Agendamento online
            </span>

            <div className="space-y-5">
              <h1 className="text-4xl font-bold leading-[1.05] tracking-tight text-[#1F2937] sm:text-5xl lg:text-6xl">
                {clinic.name}
              </h1>
              <p className="max-w-md text-base leading-relaxed text-slate-600 sm:text-lg">
                Agende sua consulta em minutos, com conforto e praticidade. Sem
                ligações, sem espera — tudo na palma da sua mão.
              </p>
            </div>

            {services.length > 0 && (
              <div className="flex flex-wrap items-center gap-4">
                <Link
                  href={agendarHref}
                  className="group inline-flex h-12 items-center gap-2 rounded-full bg-rose-600 px-7 text-sm font-semibold text-white shadow-md shadow-rose-600/20 transition hover:bg-rose-700 hover:shadow-lg"
                >
                  Agendar consulta
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
                <span className="text-sm text-slate-500">
                  {services.length} serviço
                  {services.length !== 1 ? "s" : ""} disponíve
                  {services.length !== 1 ? "is" : "l"}
                </span>
              </div>
            )}

            <ul className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-2 text-xs text-slate-500">
              <li className="flex items-center gap-1.5">
                <ShieldCheck className="size-3.5 text-rose-600" />
                Confirmação imediata
              </li>
              <li className="flex items-center gap-1.5">
                <Clock className="size-3.5 text-rose-600" />
                Disponível 24/7
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="size-3.5 text-rose-600" />
                Sem precisar ligar
              </li>
            </ul>
          </div>

          {/* Coluna direita: visual decorativo (apenas lg+) */}
          <div className="relative hidden lg:block">
            <div className="relative mx-auto aspect-square w-full max-w-md">
              {/* Card principal */}
              <div className="absolute inset-0 overflow-hidden rounded-[2rem] bg-gradient-to-br from-rose-100 via-rose-50 to-pink-100 shadow-xl shadow-rose-200/40">
                {/* Padrão decorativo: círculos sutis */}
                <div className="absolute right-8 top-8 size-32 rounded-full border border-white/40" />
                <div className="absolute right-16 top-16 size-20 rounded-full border border-white/60" />
                <div className="absolute -bottom-8 -left-8 size-48 rounded-full bg-white/30" />

                {/* Logo/inicial central */}
                <div className="absolute inset-0 flex items-center justify-center">
                  {clinic.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={clinic.logoUrl}
                      alt={`Logo ${clinic.name}`}
                      className="size-36 rounded-3xl border border-white/60 bg-white object-contain p-4 shadow-lg"
                    />
                  ) : (
                    <div className="flex size-36 items-center justify-center rounded-3xl bg-white text-5xl font-bold text-rose-600 shadow-lg">
                      {initial}
                    </div>
                  )}
                </div>
              </div>

              {/* Chip flutuante: confirmação */}
              <div className="absolute -left-6 top-12 flex items-center gap-2.5 rounded-full bg-white px-4 py-2.5 shadow-lg ring-1 ring-slate-200/70">
                <div className="flex size-7 items-center justify-center rounded-full bg-emerald-100">
                  <CheckCircle2 className="size-4 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-[#1F2937]">
                    Consulta confirmada
                  </p>
                  <p className="text-[10px] text-slate-500">
                    em menos de 1 minuto
                  </p>
                </div>
              </div>

              {/* Chip flutuante: agenda */}
              <div className="absolute -bottom-4 -right-4 flex items-center gap-2.5 rounded-full bg-white px-4 py-2.5 shadow-lg ring-1 ring-slate-200/70">
                <div className="flex size-7 items-center justify-center rounded-full bg-rose-100">
                  <Calendar className="size-4 text-rose-600" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-[#1F2937]">
                    Seu horário, sua escolha
                  </p>
                  <p className="text-[10px] text-slate-500">
                    de segunda a sábado
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ───────── BANNER: Pré-avaliação Inteligente ───────── */}
      <section className="relative z-10 mx-auto max-w-6xl px-4 lg:px-8">
        <div className="-mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:gap-6 sm:p-6">
          <div className="flex items-center gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500 to-rose-600 text-white shadow-md shadow-rose-600/20">
              <Sparkles className="size-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold tracking-tight">
                  Pré-avaliação Inteligente
                </p>
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-700">
                  Em breve
                </span>
              </div>
              <p className="mt-0.5 max-w-md text-sm text-slate-600">
                Responda algumas perguntas e a clínica já recebe um pré-diagnóstico
                para agilizar seu atendimento.
              </p>
            </div>
          </div>
          {services.length > 0 && (
            <Link
              href={agendarHref}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-rose-600 hover:text-rose-700"
            >
              Agendar agora
              <ArrowRight className="size-4" />
            </Link>
          )}
        </div>
      </section>

      {/* ───────────────── SERVIÇOS ───────────────── */}
      <section className="mx-auto max-w-6xl px-4 py-16 lg:px-8 lg:py-20">
        <div className="mx-auto mb-12 max-w-2xl space-y-3 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-rose-600">
            Serviços
          </p>
          <h2 className="text-3xl font-bold tracking-tight text-[#1F2937] sm:text-4xl">
            Tudo que oferecemos
          </h2>
          <p className="text-slate-600">
            Escolha o serviço, o profissional e o melhor horário para você. Em
            poucos cliques.
          </p>
        </div>

        {services.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
            <Stethoscope className="mx-auto size-10 text-slate-300" />
            <p className="mt-4 text-sm text-slate-500">
              Nenhum serviço disponível no momento.
            </p>
            <p className="text-sm text-slate-500">
              Entre em contato com a clínica.
            </p>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((service) => (
              <ServiceCard
                key={service.id}
                name={service.name}
                durationMinutes={service.durationMinutes}
                priceCents={service.priceCents}
                href={agendarHref}
              />
            ))}
          </div>
        )}
      </section>

      {/* ───────────────── CONTATO ───────────────── */}
      {hasContactInfo && (
        <section className="border-y border-slate-200/80 bg-white">
          <div className="mx-auto max-w-6xl px-4 py-16 lg:px-8 lg:py-20">
            <div className="mx-auto mb-12 max-w-2xl space-y-3 text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-rose-600">
                Contato
              </p>
              <h2 className="text-3xl font-bold tracking-tight text-[#1F2937] sm:text-4xl">
                Onde estamos
              </h2>
              <p className="text-slate-600">
                Estamos prontos para te receber com todo cuidado e conforto.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {clinic.address && (
                <ContactCard
                  icon={<MapPin className="size-5" />}
                  label="Endereço"
                >
                  <span className="whitespace-pre-line">{clinic.address}</span>
                </ContactCard>
              )}
              {clinic.hoursText && (
                <ContactCard
                  icon={<Clock className="size-5" />}
                  label="Horário"
                >
                  {clinic.hoursText}
                </ContactCard>
              )}
              {clinic.phone && (
                <ContactCard
                  icon={<Phone className="size-5" />}
                  label="Telefone"
                >
                  <a
                    href={`tel:${clinic.phone.replace(/\D/g, "")}`}
                    className="text-rose-600 hover:underline"
                  >
                    {clinic.phone}
                  </a>
                </ContactCard>
              )}
              {clinic.contactEmail && (
                <ContactCard
                  icon={<Mail className="size-5" />}
                  label="E-mail"
                >
                  <a
                    href={`mailto:${clinic.contactEmail}`}
                    className="break-words text-rose-600 hover:underline"
                  >
                    {clinic.contactEmail}
                  </a>
                </ContactCard>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ───────────────── CTA FINAL ───────────────── */}
      {services.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-16 lg:px-8 lg:py-20">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-rose-600 via-rose-500 to-pink-500 p-10 text-center text-white shadow-xl shadow-rose-300/30 sm:p-16">
            {/* Decoração */}
            <div className="pointer-events-none absolute -right-20 -top-20 size-64 rounded-full bg-white/10" />
            <div className="pointer-events-none absolute -bottom-24 -left-16 size-72 rounded-full bg-white/10" />

            <div className="relative mx-auto max-w-xl space-y-6">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Pronto para cuidar de você?
              </h2>
              <p className="text-rose-50/95">
                Agende online em menos de 1 minuto. Confirmação imediata, sem
                precisar ligar.
              </p>
              <Link
                href={agendarHref}
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "h-12 rounded-full bg-white px-8 text-sm font-semibold text-rose-600 shadow-lg transition hover:bg-rose-50 hover:shadow-xl",
                )}
              >
                <Calendar className="mr-2 size-4" />
                Agendar consulta
              </Link>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

// ──────────────── Componentes auxiliares ────────────────

function ServiceCard({
  name,
  durationMinutes,
  priceCents,
  href,
}: {
  name: string;
  durationMinutes: number;
  priceCents: number | null;
  href: string;
}) {
  return (
    <div className="group relative flex flex-col rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-rose-200 hover:shadow-md">
      {/* Ícone */}
      <div className="mb-5 flex size-11 items-center justify-center rounded-xl bg-rose-50 text-rose-600 transition-colors group-hover:bg-rose-600 group-hover:text-white">
        <Stethoscope className="size-5" />
      </div>

      {/* Nome */}
      <h3 className="text-lg font-semibold leading-snug tracking-tight text-[#1F2937]">
        {name}
      </h3>

      {/* Badges */}
      <div className="mt-3 flex flex-wrap gap-2">
        <Badge
          variant="secondary"
          className="gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-700"
        >
          <Clock className="size-3" />
          {formatDuration(durationMinutes)}
        </Badge>
        {priceCents != null && (
          <Badge
            variant="outline"
            className="rounded-full border-rose-200 bg-rose-50/60 px-2.5 py-0.5 text-[11px] font-semibold text-rose-700"
          >
            {formatPriceCents(priceCents)}
          </Badge>
        )}
      </div>

      {/* CTA */}
      <Link
        href={href}
        className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-rose-600 transition-colors hover:text-rose-700"
      >
        Agendar
        <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
      </Link>
    </div>
  );
}

function ContactCard({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-[#FAFAFA] p-5 transition-colors hover:bg-rose-50/40">
      <div className="flex size-10 items-center justify-center rounded-xl bg-white text-rose-600 shadow-sm">
        {icon}
      </div>
      <div className="space-y-1">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          {label}
        </p>
        <div className="text-sm leading-relaxed text-[#1F2937]">{children}</div>
      </div>
    </div>
  );
}
