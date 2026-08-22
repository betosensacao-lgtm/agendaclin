/**
 * Admin group layout. requireRole('admin') redirects to /login if
 * unauthenticated or if role != admin.
 */
import { Sparkles } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { requireRole } from "@/lib/auth/guards";
import { withTenant } from "@/lib/db/tenant";
import { getClinicById } from "@/lib/db/queries/clinics";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole("admin");
  const clinic = await withTenant(user.clinicId, (tx) =>
    getClinicById(tx, user.clinicId),
  );
  const showOnboardingBanner =
    clinic !== null && clinic.onboardingCompleted === false;

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-6">
            <Link href="/agenda" className="font-semibold">
              BookClinic
            </Link>
            <nav className="flex items-center gap-4 text-sm text-muted-foreground">
              <Link href="/agenda" className="hover:text-foreground">
                Schedule
              </Link>
              <Link href="/consultas" className="hover:text-foreground">
                Appointments
              </Link>
              <Link href="/servicos" className="hover:text-foreground">
                Services
              </Link>
              <Link href="/profissionais" className="hover:text-foreground">
                Providers
              </Link>
              <Link href="/horarios" className="hover:text-foreground">
                Availability
              </Link>
              <Link href="/clinica" className="hover:text-foreground">
                Clinic
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-muted-foreground">{user.name}</span>
            <form action="/logout" method="post">
              <button
                type="submit"
                className="text-muted-foreground hover:text-foreground"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      {showOnboardingBanner && (
        <div className="border-b bg-blue-50 dark:bg-blue-950/30">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-2.5 text-sm">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-blue-600 dark:text-blue-400" />
              <span>
                <strong>Let&apos;s set up your clinic!</strong> Complete 5 steps
                to start receiving bookings.
              </span>
            </div>
            <Link
              href="/onboarding"
              className={buttonVariants({ size: "sm" })}
            >
              Continue setup
            </Link>
          </div>
        </div>
      )}

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        {children}
      </main>
    </div>
  );
}
