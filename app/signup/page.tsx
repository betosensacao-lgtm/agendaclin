/**
 * Public clinic registration page. Server Component renders the wrapper
 * — all logic lives in SignUpForm (client).
 */
import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/guards";

import { SignUpForm } from "./signup-form";

export default async function SignUpPage() {
  const current = await getCurrentUser();
  if (current) {
    redirect(current.role === "admin" ? "/agenda" : "/minha-agenda");
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Register your clinic</h1>
        <p className="text-sm text-muted-foreground">
          Start receiving online bookings in 2 minutes. Free.
        </p>
      </div>

      <div className="mt-6">
        <SignUpForm />
      </div>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-foreground hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
