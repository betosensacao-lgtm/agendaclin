/**
 * Server Actions do painel admin para mutação de bookings.
 *
 *   updateBookingStatusAction  altera status (cancel/attended/no_show)
 *
 * Tudo escopado por clinic_id do usuário logado.
 */
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireRole } from "@/lib/auth/guards";
import {
  BOOKING_STATUSES,
  updateBookingStatus,
} from "@/lib/db/queries/bookings";

// -----------------------------------------------------------------------
// updateBookingStatusAction
// -----------------------------------------------------------------------

// Restrição: o admin só pode mudar para esses três estados a partir da UI.
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
  const user = await requireRole("admin");

  const parsed = InputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Dados inválidos." };
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
