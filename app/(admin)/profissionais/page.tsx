/**
 * Página de gerenciamento de profissionais. Server Component carrega
 * profissionais (com serviços já agrupados) + lista de serviços ativos
 * pra popular o multi-select do form.
 */
import { requireRole } from "@/lib/auth/guards";
import { listProfessionalsByClinic } from "@/lib/db/queries/professionals";
import { listServicesByClinic } from "@/lib/db/queries/services";

import { ProfessionalsPanel } from "./professionals-panel";

export default async function ProfissionaisPage() {
  const user = await requireRole("admin");
  const [professionals, allServices] = await Promise.all([
    listProfessionalsByClinic(user.clinicId),
    listServicesByClinic(user.clinicId),
  ]);

  // Para o multi-select no form, mostramos apenas serviços ativos.
  const activeServices = allServices.filter((s) => s.active);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Profissionais</h1>
        <p className="text-sm text-muted-foreground">
          Cadastre dentistas, esteticistas e demais profissionais. Vincule
          os serviços que cada um atende — só esses aparecem pro paciente
          escolher.
        </p>
      </div>
      <ProfessionalsPanel
        professionals={professionals}
        availableServices={activeServices}
      />
    </div>
  );
}
