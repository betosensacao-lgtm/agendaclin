/**
 * Layout do grupo (public). Sem auth guard — qualquer visitante acessa.
 *
 * O layout NÃO impõe container — cada página define a própria largura.
 * Isso permite que a landing use full-bleed com hero amplo, enquanto
 * páginas de fluxo (agendar, confirmado, cancelar, remarcar) usam
 * `max-w-2xl mx-auto` localmente.
 */
export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-[#FAFAFA]">
      <main className="flex-1">{children}</main>
      <footer className="border-t bg-white py-5 text-center text-xs text-muted-foreground">
        Online Booking · BookClinic
      </footer>
    </div>
  );
}
