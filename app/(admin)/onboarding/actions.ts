/**
 * Server Action que marca o onboarding como concluído.
 */
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireRole } from "@/lib/auth/guards";
import { markOnboardingCompleted } from "@/lib/db/queries/clinics";

export async function completeOnboardingAction(): Promise<void> {
  const user = await requireRole("admin");
  await markOnboardingCompleted(user.clinicId);
  revalidatePath("/onboarding");
  revalidatePath("/agenda");
  redirect("/agenda");
}
