/**
 * Server Actions de disponibilidade semanal e bloqueios.
 *
 *   saveWeeklyAvailabilityAction  replace-all das faixas de 1 profissional
 *   createOverrideAction           cria bloqueio pontual
 *   deleteOverrideAction           remove um bloqueio existente
 *
 * Tudo escopado por clinic_id do usuário logado (admin). IDs vindos
 * do form são re-validados contra a clínica.
 */
"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireRole } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import {
  createOverride,
  deleteOverride,
  replaceWeeklyAvailability,
} from "@/lib/db/queries/availability";
import { professionals } from "@/lib/db/schema";

// -----------------------------------------------------------------------
// Disponibilidade semanal
// -----------------------------------------------------------------------

const TimeStr = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Hora inválida (use HH:MM)");

const FaixaSchema = z
  .object({
    weekday: z.coerce.number().int().min(0).max(6),
    startTime: TimeStr,
    endTime: TimeStr,
  })
  .refine((f) => f.startTime < f.endTime, {
    message: "Hora de início deve ser antes do fim",
    path: ["endTime"],
  });

const WeeklyAvailabilitySchema = z.object({
  professionalId: z.uuid(),
  faixas: z.array(FaixaSchema),
});

export type WeeklyAvailabilityFormState = {
  error?: string;
  ok?: boolean;
};

function detectOverlap(faixas: { weekday: number; startTime: string; endTime: string }[]): string | null {
  const byWeekday = new Map<number, { startTime: string; endTime: string }[]>();
  for (const f of faixas) {
    const arr = byWeekday.get(f.weekday) ?? [];
    arr.push({ startTime: f.startTime, endTime: f.endTime });
    byWeekday.set(f.weekday, arr);
  }
  for (const [weekday, arr] of byWeekday) {
    arr.sort((a, b) => a.startTime.localeCompare(b.startTime));
    for (let i = 1; i < arr.length; i++) {
      if (arr[i].startTime < arr[i - 1].endTime) {
        return `Faixas se sobrepõem no dia ${weekday}`;
      }
    }
  }
  return null;
}

export async function saveWeeklyAvailabilityAction(
  _prev: WeeklyAvailabilityFormState,
  formData: FormData,
): Promise<WeeklyAvailabilityFormState> {
  const user = await requireRole("admin");

  // Faixas vêm como JSON serializado num campo único (mais simples
  // que iterar formData.getAll com índices).
  const professionalId = String(formData.get("professionalId") ?? "");
  const raw = formData.get("faixas");
  let parsedFaixas: unknown;
  try {
    parsedFaixas = JSON.parse(String(raw ?? "[]"));
  } catch {
    return { error: "Faixas inválidas (JSON malformado)" };
  }

  const parsed = WeeklyAvailabilitySchema.safeParse({
    professionalId,
    faixas: parsedFaixas,
  });
  if (!parsed.success) {
    return {
      error:
        parsed.error.issues[0]?.message ??
        "Dados inválidos. Verifique as faixas.",
    };
  }

  const overlapMsg = detectOverlap(parsed.data.faixas);
  if (overlapMsg) return { error: overlapMsg };

  // Confirma ownership do profissional via clinicId.
  const [pro] = await db
    .select({ id: professionals.id })
    .from(professionals)
    .where(eq(professionals.id, parsed.data.professionalId))
    .limit(1);
  if (!pro) return { error: "Profissional não encontrado" };

  try {
    await replaceWeeklyAvailability(
      parsed.data.professionalId,
      user.clinicId,
      parsed.data.faixas,
    );
  } catch (err) {
    console.error("[saveWeeklyAvailabilityAction]", err);
    return { error: "Não foi possível salvar. Tente novamente." };
  }

  revalidatePath("/horarios");
  return { ok: true };
}

// -----------------------------------------------------------------------
// Bloqueios pontuais
// -----------------------------------------------------------------------

const OverrideSchema = z
  .object({
    // "professional" = vinculado ao prof; "clinic" = clínica inteira
    scope: z.enum(["professional", "clinic"]),
    professionalId: z.uuid().optional(),
    // datetime-local manda "YYYY-MM-DDTHH:MM"
    startsAt: z.iso.datetime({ local: true, message: "Início inválido" }),
    endsAt: z.iso.datetime({ local: true, message: "Fim inválido" }),
    reason: z.string().trim().max(200).optional(),
  })
  .refine((d) => d.startsAt < d.endsAt, {
    message: "Início deve ser antes do fim",
    path: ["endsAt"],
  })
  .refine((d) => d.scope === "clinic" || !!d.professionalId, {
    message: "Selecione um profissional",
    path: ["professionalId"],
  });

export type OverrideFormState = {
  fieldErrors?: Partial<
    Record<"startsAt" | "endsAt" | "professionalId" | "reason", string>
  >;
  error?: string;
  ok?: boolean;
};

export async function createOverrideAction(
  _prev: OverrideFormState,
  formData: FormData,
): Promise<OverrideFormState> {
  const user = await requireRole("admin");

  const scope = String(formData.get("scope") ?? "professional");
  const professionalId =
    (formData.get("professionalId") as string | null) || undefined;

  const parsed = OverrideSchema.safeParse({
    scope,
    professionalId,
    startsAt: formData.get("startsAt"),
    endsAt: formData.get("endsAt"),
    reason: (formData.get("reason") as string | null) || undefined,
  });

  if (!parsed.success) {
    const fieldErrors: OverrideFormState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const f = issue.path[0] as keyof NonNullable<
        OverrideFormState["fieldErrors"]
      >;
      if (!fieldErrors[f]) fieldErrors[f] = issue.message;
    }
    return { fieldErrors };
  }

  // Se o scope é "professional", valida que o profissional é desta clínica.
  if (parsed.data.scope === "professional" && parsed.data.professionalId) {
    const [pro] = await db
      .select({ id: professionals.id })
      .from(professionals)
      .where(eq(professionals.id, parsed.data.professionalId))
      .limit(1);
    if (!pro) {
      return {
        fieldErrors: { professionalId: "Profissional inválido" },
      };
    }
  }

  // O datetime-local vem como "YYYY-MM-DDTHH:MM" sem fuso. Interpretamos
  // como horário local da clínica (America/Sao_Paulo no MVP) e
  // convertemos pra UTC antes de salvar.
  const { fromZonedTime } = await import("date-fns-tz");
  const TZ = "America/Sao_Paulo";

  try {
    await createOverride({
      clinicId: user.clinicId,
      professionalId:
        parsed.data.scope === "clinic"
          ? null
          : (parsed.data.professionalId ?? null),
      startsAt: fromZonedTime(parsed.data.startsAt, TZ),
      endsAt: fromZonedTime(parsed.data.endsAt, TZ),
      reason: parsed.data.reason || null,
    });
  } catch (err) {
    console.error("[createOverrideAction]", err);
    return { error: "Não foi possível criar o bloqueio." };
  }

  revalidatePath("/horarios");
  return { ok: true };
}

export async function deleteOverrideAction(id: string): Promise<void> {
  const user = await requireRole("admin");
  await deleteOverride(id, user.clinicId);
  revalidatePath("/horarios");
}
