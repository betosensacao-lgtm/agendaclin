/**
 * Helpers de envio de emails transacionais.
 *
 * Política:
 *  - Funções são NO-THROW. Se o Resend falhar (rede, key inválida, etc),
 *    apenas logam e retornam — uma falha de email NUNCA deve derrubar
 *    o fluxo principal de agendamento.
 *  - Renderização dos templates via @react-email/components.
 *  - Chamadas devem ser feitas via `after()` do Next pra não bloquear
 *    a resposta ao usuário.
 */
import BookingConfirmation from "@/emails/BookingConfirmation";
import StaffNotification from "@/emails/StaffNotification";
import WelcomeClinic from "@/emails/WelcomeClinic";
import { buildBookingIcs } from "@/lib/calendar/ics";
import { getAppUrl, getFromAddress, getResend } from "@/lib/email/client";
import { DEFAULT_TZ } from "@/lib/timezone";

function formatDateTimeFull(date: Date, tz: string = DEFAULT_TZ): string {
  const ddmm = date.toLocaleDateString("pt-BR", {
    timeZone: tz,
    weekday: "long",
    day: "2-digit",
    month: "long",
  });
  const hhmm = date.toLocaleTimeString("pt-BR", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return `${ddmm} às ${hhmm}`;
}

// ---------------------------------------------------------------------------
// Confirmação ao paciente
// ---------------------------------------------------------------------------

export async function sendBookingConfirmation(input: {
  patientEmail: string;
  patientName: string;
  clinicName: string;
  clinicSlug: string;
  clinicAddress?: string | null;
  serviceName: string;
  professionalName: string;
  startsAt: Date;
  endsAt: Date;
  durationMinutes: number;
  bookingId: string;
  cancelToken: string;
}): Promise<void> {
  const resend = getResend();
  if (!resend) return;

  const appUrl = getAppUrl();
  const cancelUrl = `${appUrl}/${input.clinicSlug}/cancelar/${input.cancelToken}`;
  const rescheduleUrl = `${appUrl}/${input.clinicSlug}/remarcar/${input.cancelToken}`;
  const manageUrl = `${appUrl}/${input.clinicSlug}/confirmado/${input.cancelToken}`;
  const dateTimeFormatted = formatDateTimeFull(input.startsAt);

  // .ics como attachment — paciente abre uma vez e o evento entra no
  // calendário dele (Google, Apple, Outlook etc.).
  const ics = buildBookingIcs({
    bookingId: input.bookingId,
    startsAt: input.startsAt,
    endsAt: input.endsAt,
    clinicName: input.clinicName,
    serviceName: input.serviceName,
    professionalName: input.professionalName,
    address: input.clinicAddress,
    manageUrl,
  });

  try {
    const { error } = await resend.emails.send({
      from: `${input.clinicName} <${getFromAddress()}>`,
      to: input.patientEmail,
      subject: `Consulta confirmada — ${dateTimeFormatted}`,
      react: BookingConfirmation({
        patientName: input.patientName,
        clinicName: input.clinicName,
        serviceName: input.serviceName,
        professionalName: input.professionalName,
        dateTimeFormatted,
        durationMinutes: input.durationMinutes,
        manageUrl,
        cancelUrl,
        rescheduleUrl,
      }),
      attachments: [
        {
          filename: "consulta.ics",
          content: Buffer.from(ics, "utf-8").toString("base64"),
          // Resend aceita base64 string. Tipo de conteúdo é deduzido
          // pela extensão; alguns clientes preferem explícito.
          contentType: "text/calendar; method=PUBLISH; charset=UTF-8",
        },
      ],
    });
    if (error) {
      console.error("[email:sendBookingConfirmation]", error);
    }
  } catch (err) {
    console.error("[email:sendBookingConfirmation] exception", err);
  }
}

// ---------------------------------------------------------------------------
// Notificação ao staff (new booking)
// ---------------------------------------------------------------------------

export async function sendStaffNotification(input: {
  staffEmail: string;
  kind: "new" | "cancelled" | "rescheduled";
  clinicName: string;
  patientName: string;
  patientEmail: string;
  patientPhone: string;
  serviceName: string;
  professionalName: string;
  startsAt: Date;
}): Promise<void> {
  const resend = getResend();
  if (!resend) return;

  const dateTimeFormatted = formatDateTimeFull(input.startsAt);
  const subject =
    input.kind === "new"
      ? `Novo agendamento — ${input.patientName} (${dateTimeFormatted})`
      : input.kind === "rescheduled"
        ? `Agendamento remarcado — ${input.patientName} (${dateTimeFormatted})`
        : `Agendamento cancelado — ${input.patientName} (${dateTimeFormatted})`;

  try {
    const { error } = await resend.emails.send({
      from: `${input.clinicName} <${getFromAddress()}>`,
      to: input.staffEmail,
      subject,
      react: StaffNotification({
        kind: input.kind,
        clinicName: input.clinicName,
        patientName: input.patientName,
        patientEmail: input.patientEmail,
        patientPhone: input.patientPhone,
        serviceName: input.serviceName,
        professionalName: input.professionalName,
        dateTimeFormatted,
      }),
    });
    if (error) {
      console.error("[email:sendStaffNotification]", error);
    }
  } catch (err) {
    console.error("[email:sendStaffNotification] exception", err);
  }
}

// ---------------------------------------------------------------------------
// Boas-vindas (admin de clínica recém-cadastrada)
// ---------------------------------------------------------------------------

export async function sendWelcomeClinic(input: {
  adminEmail: string;
  adminName: string;
  clinicName: string;
  clinicSlug: string;
}): Promise<void> {
  const resend = getResend();
  if (!resend) return;

  const appUrl = getAppUrl();
  const publicUrl = `${appUrl}/${input.clinicSlug}`;
  const onboardingUrl = `${appUrl}/onboarding`;

  try {
    const { error } = await resend.emails.send({
      from: `agendaclin <${getFromAddress()}>`,
      to: input.adminEmail,
      subject: `Bem-vindo ao agendaclin, ${input.clinicName}`,
      react: WelcomeClinic({
        adminName: input.adminName,
        clinicName: input.clinicName,
        publicUrl,
        onboardingUrl,
      }),
    });
    if (error) {
      console.error("[email:sendWelcomeClinic]", error);
    }
  } catch (err) {
    console.error("[email:sendWelcomeClinic] exception", err);
  }
}
