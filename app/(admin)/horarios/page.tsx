/**
 * Página de gerenciamento de horários.
 *
 *   /horarios            → mostra o primeiro profissional ativo
 *   /horarios?prof=<id>  → mostra o profissional selecionado
 *
 * A escolha de profissional vai via searchParam (não state) — é
 * comportamento previsível, server-rendered, e força o admin a
 * salvar antes de trocar (sem perda silenciosa).
 */
import { requireRole } from "@/lib/auth/guards";
import {
  getWeeklyAvailability,
  listFutureOverrides,
} from "@/lib/db/queries/availability";
import { listProfessionalsByClinic } from "@/lib/db/queries/professionals";

import { HorariosPanel } from "./horarios-panel";

export default async function HorariosPage({
  searchParams,
}: {
  searchParams: Promise<{ prof?: string }>;
}) {
  const user = await requireRole("admin");
  const params = await searchParams;

  const allPros = await listProfessionalsByClinic(user.clinicId);
  const activePros = allPros.filter((p) => p.active);

  // Profissional selecionado: do query param se válido, senão o primeiro ativo.
  const selectedId =
    params.prof && activePros.some((p) => p.id === params.prof)
      ? params.prof
      : (activePros[0]?.id ?? null);

  const [weekly, overrides] = await Promise.all([
    selectedId
      ? getWeeklyAvailability(selectedId, user.clinicId)
      : Promise.resolve([]),
    listFutureOverrides(user.clinicId),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Horários</h1>
        <p className="text-sm text-muted-foreground">
          Configure os horários semanais de cada profissional e cadastre
          bloqueios pontuais (feriados, eventos, almoço variável).
        </p>
      </div>

      <HorariosPanel
        professionals={activePros.map((p) => ({ id: p.id, name: p.name }))}
        selectedProfessionalId={selectedId}
        weeklyAvailability={weekly.map((w) => ({
          weekday: w.weekday,
          startTime: w.startTime,
          endTime: w.endTime,
        }))}
        overrides={overrides.map((o) => ({
          id: o.id,
          professionalId: o.professionalId,
          startsAt: o.startsAt.toISOString(),
          endsAt: o.endsAt.toISOString(),
          reason: o.reason,
        }))}
      />
    </div>
  );
}
