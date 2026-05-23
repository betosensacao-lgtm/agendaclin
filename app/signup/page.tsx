/**
 * Página pública de cadastro de clínicas. Server Component só renderiza
 * o wrapper — toda a lógica vive no SignUpForm (client).
 *
 * Se usuário já está logado, redireciona pra /agenda ou /minha-agenda.
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
        <h1 className="text-2xl font-bold">Cadastre sua clínica</h1>
        <p className="text-sm text-muted-foreground">
          Comece a receber agendamentos online em 2 minutos. Grátis.
        </p>
      </div>

      <div className="mt-6">
        <SignUpForm />
      </div>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Já tem conta?{" "}
        <Link href="/login" className="font-medium text-foreground hover:underline">
          Faça login
        </Link>
      </p>
    </div>
  );
}
