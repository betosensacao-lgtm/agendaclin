/**
 * Templates de mensagens WhatsApp para o agendaclin.
 *
 * Usa formatação do WhatsApp:
 *   *negrito*   _itálico_   ~tachado~
 */

import { DEFAULT_TZ } from "@/lib/timezone";

function formatDate(date: Date, tz: string = DEFAULT_TZ): string {
  return date.toLocaleDateString("pt-BR", {
    timeZone: tz,
    weekday: "long",
    day: "2-digit",
    month: "long",
  });
}

function formatTime(date: Date, tz: string = DEFAULT_TZ): string {
  return date.toLocaleTimeString("pt-BR", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/**
 * Mensagem de lembrete enviada ~24h antes da consulta.
 */
export function buildReminderMessage(input: {
  patientName: string;
  clinicName: string;
  serviceName: string;
  professionalName: string;
  startsAt: Date;
  manageUrl: string;
  timezone?: string;
}): string {
  const tz = input.timezone ?? DEFAULT_TZ;
  const firstName = input.patientName.split(" ")[0];
  const dateStr = formatDate(input.startsAt, tz);
  const timeStr = formatTime(input.startsAt, tz);

  return [
    `Olá, ${firstName}! 👋`,
    ``,
    `Lembrando que você tem uma consulta *amanhã* em *${input.clinicName}*:`,
    ``,
    `📋 *${input.serviceName}*`,
    `👤 ${input.professionalName}`,
    `📅 ${dateStr} às *${timeStr}*`,
    ``,
    `🔗 Gerenciar consulta (remarcar ou cancelar):`,
    input.manageUrl,
    ``,
    `_Para não receber mais lembretes, cancele pelo link acima._`,
  ].join("\n");
}
