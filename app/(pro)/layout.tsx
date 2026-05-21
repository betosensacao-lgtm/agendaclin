/**
 * Layout do grupo (pro) — exclusivo para profissionais logados.
 * Tela "minha agenda" só mostra os bookings do profissional logado.
 */
import Link from "next/link";

import { requireRole } from "@/lib/auth/guards";

export default async function ProLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole("professional");

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Link href="/minha-agenda" className="font-semibold">
            agendaclin
          </Link>
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
