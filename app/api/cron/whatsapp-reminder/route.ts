/**
 * GET /api/cron/whatsapp-reminder
 *
 * Cron job executado a cada hora pelo Vercel.
 * Busca agendamentos que estão entre 23h e 25h no futuro,
 * ainda sem lembrete enviado, e dispara mensagem via Z-API.
 *
 * Proteção: verifica o header Authorization com CRON_SECRET.
 * O Vercel injeta automaticamente esse header nas chamadas de cron.
 *
 * Referência: https://vercel.com/docs/cron-jobs/manage-cron-jobs#securing-cron-jobs
 */

import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";

import { cronDb } from "@/lib/db/cron";
import {
  getBookingsDueForReminder,
  markReminderSent,
} from "@/lib/db/queries/bookings";
import { getAppUrl } from "@/lib/email/client";
import { buildReminderMessage } from "@/lib/whatsapp/templates";
import { sendWhatsAppText } from "@/lib/whatsapp/zapi";

export const runtime = "nodejs";
// Garante que o cron não expire em 10s (default Edge). 60s é suficiente.
export const maxDuration = 60;

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    // Sem secret configurado: aceita só em desenvolvimento local.
    return process.env.NODE_ENV !== "production";
  }
  const authHeader = req.headers.get("authorization");
  return authHeader === `Bearer ${secret}`;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const bookingsDue = await getBookingsDueForReminder(cronDb);

  if (bookingsDue.length === 0) {
    return NextResponse.json({ sent: 0, message: "Nenhum lembrete pendente." });
  }

  const appUrl = getAppUrl();
  let sent = 0;
  let failed = 0;

  // Envia em background pra não bloquear a resposta do cron.
  after(async () => {
    for (const booking of bookingsDue) {
      const manageUrl = `${appUrl}/${booking.clinic.slug}/confirmado/${booking.cancelToken}`;

      const message = buildReminderMessage({
        patientName: booking.patientName,
        clinicName: booking.clinic.name,
        serviceName: booking.service.name,
        professionalName: booking.professional.name,
        startsAt: booking.startsAt,
        manageUrl,
        timezone: booking.clinic.timezone,
      });

      const result = await sendWhatsAppText(booking.patientPhone, message);

      if (result.ok) {
        await markReminderSent(cronDb, booking.id);
        sent++;
        console.log(
          `[cron:whatsapp-reminder] Enviado para booking ${booking.id} (${booking.patientPhone})`,
        );
      } else {
        failed++;
        console.error(
          `[cron:whatsapp-reminder] Falha no booking ${booking.id}: ${result.error}`,
        );
      }
    }

    console.log(
      `[cron:whatsapp-reminder] Concluído — enviados: ${sent}, falhas: ${failed}`,
    );
  });

  return NextResponse.json({
    queued: bookingsDue.length,
    message: `${bookingsDue.length} lembrete(s) enfileirado(s).`,
  });
}
