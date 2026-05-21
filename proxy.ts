/**
 * Proxy do Next 16 (era `middleware.ts` em versões anteriores) — mantém
 * a sessão do Supabase atualizada em TODA navegação. Sem isso, tokens
 * expirados não são refreshados e o usuário aparece como anônimo
 * intermitentemente.
 *
 * Padrão oficial @supabase/ssr adaptado para Next 16. Apenas chama
 * getUser() — não faz redirects (deixa pra requireUser/requireRole
 * nas páginas).
 */
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Refresca sessão se token estiver perto de expirar. NÃO remover.
  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: [
    // Tudo exceto assets estáticos
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
