/**
 * Geração de arquivo ICS (iCalendar) — RFC 5545.
 *
 * Função pura, sem I/O. Recebe dados do booking e retorna string ICS
 * que pode ser anexada ao email ou servida como download.
 *
 * Compatível com Gmail, Outlook, Apple Mail, Google Calendar e
 * todos os apps que suportam ICS (que é o padrão universal).
 */

export type BookingIcsInput = {
  /** UUID estável do booking — usado como UID do evento. */
  bookingId: string;
  /** Início em UTC. */
  startsAt: Date;
  /** Fim em UTC. */
  endsAt: Date;
  clinicName: string;
  serviceName: string;
  professionalName: string;
  /** Endereço opcional. Aparece como LOCATION. */
  address?: string | null;
  /** URL pública pra ver/cancelar (entra na DESCRIPTION). */
  manageUrl?: string;
};

/** Formata Date como "YYYYMMDDTHHMMSSZ" (UTC, sem separadores) — padrão ICS. */
function toIcsUtc(d: Date): string {
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mi = String(d.getUTCMinutes()).padStart(2, "0");
  const ss = String(d.getUTCSeconds()).padStart(2, "0");
  return `${yyyy}${mm}${dd}T${hh}${mi}${ss}Z`;
}

/**
 * Escapa caracteres especiais conforme RFC 5545 §3.3.11:
 *   - backslash, vírgula e ponto-e-vírgula viram `\<char>`
 *   - quebras de linha viram `\n` literal
 */
function escapeIcsText(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/**
 * Quebra linhas longas em 75 octets (RFC 5545 §3.1). Continuações
 * começam com espaço. Para ASCII, 75 octets = 75 chars.
 */
function foldLine(line: string): string {
  if (line.length <= 75) return line;
  const chunks: string[] = [];
  let start = 0;
  while (start < line.length) {
    const chunk = line.slice(start, start + (start === 0 ? 75 : 74));
    chunks.push(chunk);
    start += chunk.length;
  }
  return chunks.join("\r\n ");
}

export function buildBookingIcs(input: BookingIcsInput): string {
  const dtStamp = toIcsUtc(new Date());
  const dtStart = toIcsUtc(input.startsAt);
  const dtEnd = toIcsUtc(input.endsAt);

  const summary = `${input.clinicName} — ${input.serviceName}`;
  const descriptionParts = [
    `Profissional: ${input.professionalName}`,
    input.manageUrl ? `Gerenciar agendamento: ${input.manageUrl}` : null,
  ].filter(Boolean) as string[];
  const description = descriptionParts.join("\n");

  // Cada linha é folded individualmente. CRLF é mandatório no ICS.
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//agendaclin//pt-BR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    foldLine(`UID:${input.bookingId}@agendaclin`),
    `DTSTAMP:${dtStamp}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    foldLine(`SUMMARY:${escapeIcsText(summary)}`),
    foldLine(`DESCRIPTION:${escapeIcsText(description)}`),
    ...(input.address
      ? [foldLine(`LOCATION:${escapeIcsText(input.address)}`)]
      : []),
    "STATUS:CONFIRMED",
    "SEQUENCE:0",
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  return lines.join("\r\n") + "\r\n";
}
