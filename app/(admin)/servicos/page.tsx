/**
 * Página de gerenciamento de serviços. Server Component carrega a lista
 * e delega para o client component (que cuida de dialog + form state).
 */
import { requireRole } from "@/lib/auth/guards";
import { listServicesByClinic } from "@/lib/db/queries/services";

import { ServicesPanel } from "./services-panel";

export default async function ServicosPage() {
  const user = await requireRole("admin");
  const services = await listServicesByClinic(user.clinicId);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Serviços</h1>
        <p className="text-sm text-muted-foreground">
          Cadastre os procedimentos que sua clínica oferece. Desativar um
          serviço o esconde do agendamento público, mas mantém o histórico.
        </p>
      </div>
      <ServicesPanel services={services} />
    </div>
  );
}
