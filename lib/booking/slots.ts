/**
 * Geração de slots disponíveis para agendamento.
 *
 * Função pura, sem I/O. Recebe a disponibilidade semanal de um
 * profissional, os bloqueios pontuais (overrides) que se aplicam a
 * ele, os bookings já confirmados, e o range a considerar — retorna
 * a lista de janelas livres do tamanho do serviço.
 *
 * Política de geração:
 *   - Slots dentro de cada faixa começam alinhados a `startTime` e
 *     têm duração `durationMinutes`. O próximo slot começa exatamente
 *     onde o anterior termina (step = duration). Mudar depois se a
 *     clínica quiser slots de granularidade diferente.
 *   - Slot é descartado se sobrepõe (mesmo que parcialmente) um
 *     override OU um booking.
 *   - Datas no banco são `timestamptz` UTC; conversão para o fuso da
 *     clínica acontece aqui, na fronteira da lógica.
 *
 * Sem dependência de relógio (`new Date()`) — fácil de testar de forma
 * determinística.
 */
import { fromZonedTime } from "date-fns-tz";

export type WeeklyFaixa = {
  /** 0 = domingo … 6 = sábado */
  weekday: number;
  /** "HH:MM" ou "HH:MM:SS" — hora local da clínica */
  startTime: string;
  endTime: string;
};

export type TimeInterval = {
  startsAt: Date;
  endsAt: Date;
};

export type GenerateSlotsInput = {
  durationMinutes: number;
  weeklyAvailability: WeeklyFaixa[];
  /** Bloqueios pontuais que afetam o profissional (próprios + clínica). */
  overrides: TimeInterval[];
  /** Bookings confirmados do profissional no range. */
  bookings: TimeInterval[];
  /** Data local INCLUSIVA, formato "YYYY-MM-DD". */
  fromDateLocal: string;
  /** Data local EXCLUSIVA, formato "YYYY-MM-DD". */
  toDateLocal: string;
  /** IANA timezone, ex.: "America/Sao_Paulo". */
  timezone: string;
};

export type Slot = {
  start: Date;
  end: Date;
};

const YMD = /^\d{4}-\d{2}-\d{2}$/;

function assertYMD(s: string, label: string) {
  if (!YMD.test(s)) {
    throw new Error(`${label} deve estar no formato YYYY-MM-DD, recebi "${s}"`);
  }
}

function normalizeTime(t: string): string {
  // Aceita "HH:MM" e "HH:MM:SS". Normaliza para "HH:MM:SS".
  if (/^\d{2}:\d{2}$/.test(t)) return `${t}:00`;
  if (/^\d{2}:\d{2}:\d{2}$/.test(t)) return t;
  throw new Error(`Hora inválida: "${t}"`);
}

function overlaps(a: TimeInterval, b: TimeInterval): boolean {
  return a.startsAt < b.endsAt && b.startsAt < a.endsAt;
}

/**
 * Itera sobre cada dia entre `fromYMD` (inclusivo) e `toYMD` (exclusivo).
 * Como usamos só "ano-mês-dia" sem hora, é seguro usar UTC pra contagem
 * — o mesmo dia do calendário tem o mesmo `weekday` em qualquer fuso.
 */
function* eachDay(
  fromYMD: string,
  toYMD: string,
): Generator<{ ymd: string; weekday: number }> {
  const cursor = new Date(`${fromYMD}T00:00:00Z`);
  const end = new Date(`${toYMD}T00:00:00Z`);

  while (cursor < end) {
    const year = cursor.getUTCFullYear();
    const month = String(cursor.getUTCMonth() + 1).padStart(2, "0");
    const day = String(cursor.getUTCDate()).padStart(2, "0");
    yield {
      ymd: `${year}-${month}-${day}`,
      weekday: cursor.getUTCDay(),
    };
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
}

export function generateSlots(input: GenerateSlotsInput): Slot[] {
  const {
    durationMinutes,
    weeklyAvailability,
    overrides,
    bookings,
    fromDateLocal,
    toDateLocal,
    timezone,
  } = input;

  if (durationMinutes <= 0) return [];
  assertYMD(fromDateLocal, "fromDateLocal");
  assertYMD(toDateLocal, "toDateLocal");
  if (fromDateLocal >= toDateLocal) return [];

  // Agrupa faixas por weekday para lookup O(1) por dia.
  const byWeekday = new Map<number, WeeklyFaixa[]>();
  for (const faixa of weeklyAvailability) {
    if (faixa.weekday < 0 || faixa.weekday > 6) continue;
    const arr = byWeekday.get(faixa.weekday) ?? [];
    arr.push(faixa);
    byWeekday.set(faixa.weekday, arr);
  }

  const occupied: TimeInterval[] = [...overrides, ...bookings];
  const durationMs = durationMinutes * 60_000;
  const slots: Slot[] = [];

  for (const { ymd, weekday } of eachDay(fromDateLocal, toDateLocal)) {
    const faixas = byWeekday.get(weekday);
    if (!faixas || faixas.length === 0) continue;

    for (const faixa of faixas) {
      const startUtc = fromZonedTime(
        `${ymd}T${normalizeTime(faixa.startTime)}`,
        timezone,
      );
      const endUtc = fromZonedTime(
        `${ymd}T${normalizeTime(faixa.endTime)}`,
        timezone,
      );

      if (endUtc <= startUtc) continue; // faixa inválida — ignora

      // Gera slots dentro da faixa.
      let cursorMs = startUtc.getTime();
      while (cursorMs + durationMs <= endUtc.getTime()) {
        const slot: Slot = {
          start: new Date(cursorMs),
          end: new Date(cursorMs + durationMs),
        };
        const conflict = occupied.some((o) =>
          overlaps(o, { startsAt: slot.start, endsAt: slot.end }),
        );
        if (!conflict) slots.push(slot);
        cursorMs += durationMs;
      }
    }
  }

  // Ordena por início (faixas múltiplas no mesmo dia podem desordenar).
  slots.sort((a, b) => a.start.getTime() - b.start.getTime());
  return slots;
}
