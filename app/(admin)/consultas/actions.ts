/**
 * Server Action de mutação de bookings — usada tanto pelo admin (telas
 * /agenda e /consultas) quanto pelo profissional (tela /minha-agenda).
 *
 *   updateBookingStatusAction  altera status (cancel/attended/no_show)
 *
 * Tudo escopado por clinic_id do usuário logado. Além disso, se o user
 * for profissional, valida que o booking pertence a ELE (não permite
 * que um pro altere consulta de outro).
 */
"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireUser } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import {
  BOOKING_STATUSES,
  updateBookingStatus,
} from "@/lib/db/queries/bookings";
import { getProfessionalByUserId } from "@/lib/db/queries/professionals";
import { bookings } from "@/lib/db/schema";

// Restrição: a UI só permite mudar para esses três estados.
// (`confirmed` não está aqui — não faz sentido "reabrir" pela tela.)
const AllowedTransitionStatus = z.enum(["cancelled", "attended", "no_show"]);

const InputSchema = z.object({
  bookingId: z.string().uuid("ID inválido"),
  newStatus: AllowedTransitionStatus,
});

export type UpdateBookingStatusResult =
  | { ok: true }
  | { ok: false; error: string };

export async function updateBookingStatusAction(input: {
  bookingId: string;
  newStatus: (typeof BOOKING_STATUSES)[number];
}): Promise<UpdateBookingStatusResult> {
  const user = await requireUser();

  const parsed = InputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Dados inválidos." };
  }

  // Se for profissional, verifica que o booking pertence a ele.
  if (user.role === "professional") {
    const pro = await getProfessionalByUserId(user.id, user.clinicId);
    if (!pro) {
      return { ok: false, error: "Sem vínculo de profissional." };
    }
    const [match] = await db
      .select({ id: bookings.id })
      .from(bookings)
      .where(
        and(
          eq(bookings.id, parsed.data.bookingId),
          eq(bookings.professionalId, pro.id),
          eq(bookings.clinicId, user.clinicId),
        ),
      )
      .limit(1);
    if (!match) {
      return { ok: false, error: "Consulta não encontrada." };
    }
  }

  const updated = await updateBookingStatus({
    bookingId: parsed.data.bookingId,
    clinicId: user.clinicId,
    newStatus: parsed.data.newStatus,
  });

  if (!updated) {
    return { ok: false, error: "Consulta não encontrada." };
  }

  revalidatePath("/agenda");
  revalidatePath("/consultas");
  revalidatePath("/minha-agenda");
  return { ok: true };
}
