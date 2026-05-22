/**
 * Layout do grupo (public). Sem auth guard — qualquer visitante acessa.
 * Header minimalista com apenas o nome do app.
 */
export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
        {children}
      </main>
      <footer className="border-t py-4 text-center text-xs text-muted-foreground">
        Agendamento online · agendaclin
      </footer>
    </div>
  );
}
