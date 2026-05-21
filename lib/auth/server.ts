/**
 * Cliente Supabase para uso em Server Components, Route Handlers e Server
 * Actions. Lê e escreve cookies via next/headers para manter a sessão
 * sincronizada — sempre criar uma nova instância por request (a função
 * é async porque cookies() é async no App Router).
 */
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Em Server Components puros, set() lança erro — ignorável
            // porque o middleware já cuida do refresh de cookies.
          }
        },
      },
    },
  );
}
