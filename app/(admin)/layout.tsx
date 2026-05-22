/**
 * Layout do grupo (admin). requireRole('admin') redireciona pra /login
 * se anônimo OU se role != admin. Toda página filha pode assumir que
 * o usuário existe.
 */
import Link from "next/link";

import { requireRole } from "@/lib/auth/guards";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole("admin");

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-6">
            <Link href="/agenda" className="font-semibold">
              agendaclin
            </Link>
            <nav className="flex items-center gap-4 text-sm text-muted-foreground">
              <Link href="/agenda" className="hover:text-foreground">
                Agenda
              </Link>
              <Link href="/servicos" className="hover:text-foreground">
                Serviços
              </Link>
              <Link href="/profissionais" className="hover:text-foreground">
                Profissionais
              </Link>
              <Link href="/horarios" className="hover:text-foreground">
                Horários
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
                Sair
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        {children}
      </main>
    </div>
  );
}
