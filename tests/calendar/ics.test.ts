import { describe, expect, it } from "vitest";

import { buildBookingIcs } from "@/lib/calendar/ics";

describe("buildBookingIcs", () => {
  const baseInput = {
    bookingId: "abc-123",
    startsAt: new Date("2026-06-15T12:00:00.000Z"), // = 09:00 SP
    endsAt: new Date("2026-06-15T12:30:00.000Z"),
    clinicName: "Clínica Teste",
    serviceName: "Limpeza dental",
    professionalName: "Dra. Ana",
  };

  it("retorna estrutura ICS válida", () => {
    const ics = buildBookingIcs(baseInput);
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("VERSION:2.0");
    expect(ics).toContain("BEGIN:VEVENT");
    expect(ics).toContain("END:VEVENT");
    expect(ics).toContain("END:VCALENDAR");
    expect(ics).toContain("UID:abc-123@agendaclin");
  });

  it("formata DTSTART/DTEND em UTC", () => {
    const ics = buildBookingIcs(baseInput);
    expect(ics).toContain("DTSTART:20260615T120000Z");
    expect(ics).toContain("DTEND:20260615T123000Z");
  });

  it("escapa caracteres especiais no SUMMARY", () => {
    const ics = buildBookingIcs({
      ...baseInput,
      serviceName: "Limpeza; canal, raspagem",
    });
    // ; e , devem virar \; e \,
    expect(ics).toMatch(/Limpeza\\;\s?canal\\,/);
  });

  it("inclui LOCATION quando address é passado", () => {
    const ics = buildBookingIcs({
      ...baseInput,
      address: "Rua das Flores 123",
    });
    expect(ics).toContain("LOCATION:Rua das Flores 123");
  });

  it("omite LOCATION quando address não é passado", () => {
    const ics = buildBookingIcs(baseInput);
    expect(ics).not.toContain("LOCATION:");
  });

  it("usa CRLF como separador de linha (RFC 5545)", () => {
    const ics = buildBookingIcs(baseInput);
    // ICS deve usar \r\n, não só \n
    expect(ics).toContain("\r\n");
  });

  it("inclui manageUrl na DESCRIPTION quando passado", () => {
    const ics = buildBookingIcs({
      ...baseInput,
      manageUrl: "https://agendaclin.vercel.app/clinica/cancelar/xyz",
    });
    // Quando descrição passa de 75 chars, é foldada com "\r\n " no meio.
    // Removemos line folding pra checar conteúdo lógico.
    const unfolded = ics.replace(/\r\n /g, "");
    expect(unfolded).toContain("Gerenciar agendamento:");
    expect(unfolded).toContain("https://agendaclin.vercel.app/clinica/cancelar/xyz");
  });
});
