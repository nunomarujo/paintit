import { isPlatformAdmin } from '@/lib/access';
import { exchangeCodeForToken } from '@/lib/moloni';
import { getUser } from '@/lib/supabase/server';

// A Moloni devolve aqui depois do login (redirect_uri = MOLONI_REDIRECT_URI, tem de ser exatamente igual na Moloni).
export async function GET(req: Request) {
  const { supabase, user } = await getUser();
  if (!user || !(await isPlatformAdmin(supabase, user.id))) return new Response('Sem permissão.', { status: 403 });
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');
  const target = new URL('/app/backoffice/contabilidade/faturacao', url.origin);
  if (error) {
    target.searchParams.set('moloni', `erro: ${error}`);
    return Response.redirect(target.toString());
  }
  if (!code) {
    target.searchParams.set('moloni', 'sem código de autorização');
    return Response.redirect(target.toString());
  }
  try {
    await exchangeCodeForToken(code);
    target.searchParams.set('moloni', 'ligado');
  } catch (e) {
    target.searchParams.set('moloni', `erro: ${e instanceof Error ? e.message : String(e)}`);
  }
  return Response.redirect(target.toString());
}
