/**
 * Server Action que marca o onboarding como concluído.
 */
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireRole } from "@/lib/auth/guards";
import { withTenant } from "@/lib/db/tenant";
import { markOnboardingCompleted } from "@/lib/db/queries/clinics";

export async function completeOnboardingAction(): Promise<void> {
  const user = await requireRole("admin");
  await withTenant(user.clinicId, (tx) =>
    markOnboardingCompleted(tx, user.clinicId),
  );
  revalidatePath("/onboarding");
  revalidatePath("/agenda");
  redirect("/agenda");
}
