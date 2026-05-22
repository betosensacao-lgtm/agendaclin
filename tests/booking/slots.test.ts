/**
 * Testes da função pura `generateSlots`. Todos os horários esperados
 * são montados via UTC explícito pra evitar dependência do fuso da
 * máquina que roda o teste.
 *
 * Cenário base: Dra. Ana atende seg-sex 09:00-12:00 e 14:00-18:00
 * em America/Sao_Paulo (UTC-3, sem DST desde 2019).
 */
import { describe, expect, it } from "vitest";

import {
  generateSlots,
  type GenerateSlotsInput,
  type WeeklyFaixa,
} from "@/lib/booking/slots";

const SP = "America/Sao_Paulo";

const seg_a_sex: WeeklyFaixa[] = [1, 2, 3, 4, 5].flatMap((weekday) => [
  { weekday, startTime: "09:00", endTime: "12:00" },
  { weekday, startTime: "14:00", endTime: "18:00" },
]);

function input(
  overrides: Partial<GenerateSlotsInput> = {},
): GenerateSlotsInput {
  return {
    durationMinutes: 30,
    weeklyAvailability: seg_a_sex,
    overrides: [],
    bookings: [],
    fromDateLocal: "2026-06-01", // segunda-feira
    toDateLocal: "2026-06-02", // terça (exclusivo)
    timezone: SP,
    ...overrides,
  };
}

/** Helper: monta um Date UTC a partir de "YYYY-MM-DD HH:MM" em SP (UTC-3 fixo). */
function spLocal(ymd: string, hm: string): Date {
  return new Date(`${ymd}T${hm}:00-03:00`);
}

describe("generateSlots", () => {
  it("gera slots de 30min em uma faixa única (09:00-12:00) numa segunda-feira", () => {
    const slots = generateSlots(
      input({
        weeklyAvailability: [
          { weekday: 1, startTime: "09:00", endTime: "12:00" },
        ],
      }),
    );

    expect(slots).toHaveLength(6); // 09:00, 09:30, 10:00, 10:30, 11:00, 11:30
    expect(slots[0].start.toISOString()).toBe(
      spLocal("2026-06-01", "09:00").toISOString(),
    );
    expect(slots[0].end.toISOString()).toBe(
      spLocal("2026-06-01", "09:30").toISOString(),
    );
    expect(slots[5].start.toISOString()).toBe(
      spLocal("2026-06-01", "11:30").toISOString(),
    );
  });

  it("respeita as duas faixas do dia (manhã + tarde, com intervalo de almoço)", () => {
    const slots = generateSlots(input());
    // 6 slots de manhã (09-12) + 8 slots de tarde (14-18) = 14
    expect(slots).toHaveLength(14);

    const startTimes = slots.map((s) => s.start.toISOString());
    // primeiro slot da tarde é 14:00
    expect(startTimes).toContain(spLocal("2026-06-01", "14:00").toISOString());
    // NÃO deve ter slot às 12:00 ou 13:30 (almoço)
    expect(startTimes).not.toContain(
      spLocal("2026-06-01", "12:00").toISOString(),
    );
    expect(startTimes).not.toContain(
      spLocal("2026-06-01", "13:30").toISOString(),
    );
  });

  it("não gera nenhum slot em dia sem disponibilidade (sábado)", () => {
    const slots = generateSlots(
      input({
        fromDateLocal: "2026-06-06", // sábado
        toDateLocal: "2026-06-07",
      }),
    );
    expect(slots).toEqual([]);
  });

  it("remove slots que conflitam com bookings existentes", () => {
    // Dra. Ana já tem booking 10:00-10:30 e 14:00-15:00
    const slots = generateSlots(
      input({
        bookings: [
          {
            startsAt: spLocal("2026-06-01", "10:00"),
            endsAt: spLocal("2026-06-01", "10:30"),
          },
          {
            startsAt: spLocal("2026-06-01", "14:00"),
            endsAt: spLocal("2026-06-01", "15:00"),
          },
        ],
      }),
    );

    const startTimes = slots.map((s) => s.start.toISOString());
    expect(startTimes).not.toContain(
      spLocal("2026-06-01", "10:00").toISOString(),
    );
    expect(startTimes).not.toContain(
      spLocal("2026-06-01", "14:00").toISOString(),
    );
    expect(startTimes).not.toContain(
      spLocal("2026-06-01", "14:30").toISOString(),
    );
    // 14 slots originais menos 3 (10:00, 14:00, 14:30) = 11
    expect(slots).toHaveLength(11);
  });

  it("remove slots cobertos por overrides (bloqueio de almoço de 12-13 já está implícito; testar bloqueio extra)", () => {
    const slots = generateSlots(
      input({
        overrides: [
          {
            // Reunião 09:00-10:00
            startsAt: spLocal("2026-06-01", "09:00"),
            endsAt: spLocal("2026-06-01", "10:00"),
          },
        ],
      }),
    );

    const startTimes = slots.map((s) => s.start.toISOString());
    expect(startTimes).not.toContain(
      spLocal("2026-06-01", "09:00").toISOString(),
    );
    expect(startTimes).not.toContain(
      spLocal("2026-06-01", "09:30").toISOString(),
    );
    // 10:00 deve estar disponível (override termina exatamente aí)
    expect(startTimes).toContain(spLocal("2026-06-01", "10:00").toISOString());
    expect(slots).toHaveLength(12);
  });

  it("retorna vazio quando duration é maior que a faixa", () => {
    const slots = generateSlots(
      input({
        durationMinutes: 240, // 4h, mas faixa só tem 3h
        weeklyAvailability: [
          { weekday: 1, startTime: "09:00", endTime: "12:00" },
        ],
      }),
    );
    expect(slots).toEqual([]);
  });

  it("itera sobre múltiplos dias respeitando weekday correto de cada um", () => {
    const slots = generateSlots(
      input({
        fromDateLocal: "2026-06-01", // segunda
        toDateLocal: "2026-06-08", // segunda seguinte (exclusivo) → 7 dias
        weeklyAvailability: [
          { weekday: 1, startTime: "09:00", endTime: "10:00" }, // só segunda
          { weekday: 3, startTime: "09:00", endTime: "10:00" }, // só quarta
        ],
      }),
    );
    // Segunda (01/06): 2 slots de 30min (09:00, 09:30)
    // Quarta (03/06): 2 slots
    // Demais dias: 0
    expect(slots).toHaveLength(4);
    expect(slots[0].start.toISOString()).toBe(
      spLocal("2026-06-01", "09:00").toISOString(),
    );
    expect(slots[2].start.toISOString()).toBe(
      spLocal("2026-06-03", "09:00").toISOString(),
    );
  });

  it("respeita o timezone America/Sao_Paulo na conversão (UTC-3)", () => {
    const slots = generateSlots(
      input({
        weeklyAvailability: [
          { weekday: 1, startTime: "09:00", endTime: "09:30" },
        ],
      }),
    );
    expect(slots).toHaveLength(1);
    // 09:00 em SP = 12:00 UTC
    expect(slots[0].start.toISOString()).toBe("2026-06-01T12:00:00.000Z");
  });

  it("aceita HH:MM:SS e HH:MM de forma intercambiável", () => {
    const slots = generateSlots(
      input({
        weeklyAvailability: [
          { weekday: 1, startTime: "09:00:00", endTime: "09:30:00" },
        ],
      }),
    );
    expect(slots).toHaveLength(1);
  });

  it("ignora override que termina antes da faixa começar", () => {
    const slots = generateSlots(
      input({
        weeklyAvailability: [
          { weekday: 1, startTime: "09:00", endTime: "10:00" },
        ],
        overrides: [
          {
            startsAt: spLocal("2026-06-01", "07:00"),
            endsAt: spLocal("2026-06-01", "08:00"),
          },
        ],
      }),
    );
    expect(slots).toHaveLength(2); // 09:00 e 09:30
  });

  it("retorna lista vazia quando fromDate >= toDate", () => {
    expect(
      generateSlots(
        input({ fromDateLocal: "2026-06-01", toDateLocal: "2026-06-01" }),
      ),
    ).toEqual([]);
    expect(
      generateSlots(
        input({ fromDateLocal: "2026-06-02", toDateLocal: "2026-06-01" }),
      ),
    ).toEqual([]);
  });
});
