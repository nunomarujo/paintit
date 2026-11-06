import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL, supabaseConfigured } from '@/lib/supabase/env';
import { comLimite } from '@/lib/comLimite';

const LIMITE_DA_SESSAO_MS = 5000;

// Renova a sessão em cada pedido e protege a área reservada (/app).
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  if (!supabaseConfigured) return response;

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (toSet) => {
        for (const { name, value } of toSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of toSet) response.cookies.set(name, value, options);
      },
    },
  });

  // Com limite (06/11/2026): sem resposta do Supabase em 5 s, o pedido segue em vez de ficar parado até a
  // Vercel o cortar aos 25 s. Não se manda ninguém para a entrada por isso — a área reservada volta a
  // confirmar quem entrou no seu próprio layout (`src/app/app/layout.tsx`), e quem não entrou é mandado lá.
  const resposta = await comLimite(supabase.auth.getUser(), LIMITE_DA_SESSAO_MS).catch(() => null);
  if (!resposta || resposta.tipo === 'esgotado') {
    console.warn(`middleware: sem resposta do Supabase em ${LIMITE_DA_SESSAO_MS} ms (${request.nextUrl.pathname})`);
    return response;
  }
  const { data } = resposta.valor;
  if (!data.user && request.nextUrl.pathname.startsWith('/app')) {
    const url = request.nextUrl.clone();
    url.pathname = '/entrar';
    url.searchParams.set('seguinte', request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp)$).*)'],
};
