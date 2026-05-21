/**
 * Server Actions para o CRUD de serviços.
 *
 *   saveServiceAction         cria (sem id) ou atualiza (com id)
 *   toggleServiceActiveAction alterna o flag `active`
 *
 * Ambos exigem role admin via `requireRole("admin")`, que também devolve
 * o `clinicId` do usuário — toda escrita é escopada por esse tenant.
 */
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireRole } from "@/lib/auth/guards";
import {
  createService,
  updateService,
} from "@/lib/db/queries/services";

const ServiceSchema = z.object({
  id: z.uuid().optional(),
  name: z
    .string()
    .trim()
    .min(2, "Nome deve ter no mínimo 2 caracteres")
    .max(100, "Nome muito longo"),
  durationMinutes: z.coerce
    .number({ message: "Duração inválida" })
    .int("Duração deve ser número inteiro")
    .min(5, "Duração mínima: 5 minutos")
    .max(600, "Duração máxima: 600 minutos (10h)"),
  // Preço opcional: vazio = sem preço cadastrado. Aceita "120", "120.50",
  // "120,50". Convertido para centavos no servidor.
  price: z.string().trim().optional(),
});

export type ServiceFormState = {
  fieldErrors?: Partial<Record<"name" | "durationMinutes" | "price", string>>;
  error?: string;
  ok?: boolean;
};

function parsePriceToCents(price: string | undefined): number | null {
  if (!price) return null;
  const normalized = price.replace(/\s+/g, "").replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) {
    throw new Error("INVALID_PRICE");
  }
  const num = Number(normalized);
  if (Number.isNaN(num) || num < 0) throw new Error("INVALID_PRICE");
  return Math.round(num * 100);
}

export async function saveServiceAction(
  _prevState: ServiceFormState,
  formData: FormData,
): Promise<ServiceFormState> {
  const user = await requireRole("admin");

  const parsed = ServiceSchema.safeParse({
    id: formData.get("id") || undefined,
    name: formData.get("name"),
    durationMinutes: formData.get("durationMinutes"),
    price: (formData.get("price") as string) || undefined,
  });

  if (!parsed.success) {
    const fieldErrors: ServiceFormState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0] as keyof NonNullable<
        ServiceFormState["fieldErrors"]
      >;
      if (!fieldErrors[field]) fieldErrors[field] = issue.message;
    }
    return { fieldErrors };
  }

  let priceCents: number | null;
  try {
    priceCents = parsePriceToCents(parsed.data.price);
  } catch {
    return {
      fieldErrors: { price: "Preço inválido — use formato 120 ou 120,50" },
    };
  }

  const payload = {
    name: parsed.data.name,
    durationMinutes: parsed.data.durationMinutes,
    priceCents,
    // active não é editável no form de cadastro — controlado pelo toggle.
  };

  try {
    if (parsed.data.id) {
      await updateService(parsed.data.id, user.clinicId, payload);
    } else {
      await createService({ ...payload, clinicId: user.clinicId });
    }
  } catch (err) {
    console.error("[saveServiceAction]", err);
    return { error: "Não foi possível salvar. Tente novamente." };
  }

  revalidatePath("/servicos");
  return { ok: true };
}

export async function toggleServiceActiveAction(
  id: string,
  active: boolean,
): Promise<void> {
  const user = await requireRole("admin");
  await updateService(id, user.clinicId, { active });
  revalidatePath("/servicos");
}
