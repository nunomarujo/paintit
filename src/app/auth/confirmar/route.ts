import { NextResponse, type NextRequest } from 'next/server';
import { safeNext } from '@/lib/redirect';
import { createClient } from '@/lib/supabase/server';

// Destino do link enviado por email: troca o código pela sessão.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get('code');
  const next = safeNext(searchParams.get('seguinte'));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, origin));
  }
  return NextResponse.redirect(new URL('/entrar?erro=link', origin));
}
