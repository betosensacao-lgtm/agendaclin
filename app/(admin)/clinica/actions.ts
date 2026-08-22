/**
 * Server Action de atualização dos dados da clínica.
 *
 *   saveClinicAction  edita name, contactEmail, phone, address,
 *                     hoursText, logoUrl da clínica do admin logado.
 *
 * Não permite editar slug (URL pública estável) nem timezone (MVP fixo).
 */
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireRole } from "@/lib/auth/guards";
import { withTenant } from "@/lib/db/tenant";
import { updateClinicFields } from "@/lib/db/queries/clinics";

// String não-vazia ou null. Aceita string vazia do form, normaliza pra null.
const OptionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v.length === 0 ? null : v))
    .nullable();

const ClinicSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Nome obrigatório")
    .max(120, "Nome muito longo"),
  contactEmail: z
    .union([z.email("E-mail inválido"), z.literal("")])
    .transform((v) => (v ? v.toLowerCase() : null)),
  phone: OptionalText(40),
  address: OptionalText(300),
  hoursText: OptionalText(200),
  logoUrl: z
    .union([z.url("URL inválida"), z.literal("")])
    .transform((v) => (v ? v : null)),
});

export type ClinicFormState = {
  fieldErrors?: Partial<
    Record<"name" | "contactEmail" | "phone" | "address" | "hoursText" | "logoUrl", string>
  >;
  error?: string;
  ok?: boolean;
};

export async function saveClinicAction(
  _prev: ClinicFormState,
  formData: FormData,
): Promise<ClinicFormState> {
  const user = await requireRole("admin");

  const parsed = ClinicSchema.safeParse({
    name: formData.get("name"),
    contactEmail: formData.get("contactEmail") ?? "",
    phone: formData.get("phone") ?? "",
    address: formData.get("address") ?? "",
    hoursText: formData.get("hoursText") ?? "",
    logoUrl: formData.get("logoUrl") ?? "",
  });

  if (!parsed.success) {
    const fieldErrors: ClinicFormState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const root = issue.path[0] as keyof NonNullable<
        ClinicFormState["fieldErrors"]
      >;
      if (!fieldErrors[root]) fieldErrors[root] = issue.message;
    }
    return { fieldErrors };
  }

  try {
    await withTenant(user.clinicId, (tx) =>
      updateClinicFields(tx, user.clinicId, parsed.data),
    );
  } catch (err) {
    console.error("[saveClinicAction]", err);
    return { error: "Não foi possível salvar. Tente novamente." };
  }

  // Re-valida paths que mostram dados da clínica.
  revalidatePath("/clinica");
  // Landing pública usa slug, mas é cacheada por path — revalida via prefixo.
  // Como o slug pode ser qualquer string, revalidamos só a /clinica admin
  // por enquanto. Em produção, a landing é dynamic (ƒ) então renderiza fresh.
  return { ok: true };
}
