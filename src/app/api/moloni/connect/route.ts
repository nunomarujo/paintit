import { isPlatformAdmin } from '@/lib/access';
import { moloniAuthorizeUrl } from '@/lib/moloni';
import { getUser } from '@/lib/supabase/server';

// Início da ligação à Moloni (OAuth): só a equipa da plataforma pode ligar a conta.
export async function GET() {
  const { supabase, user } = await getUser();
  if (!user || !(await isPlatformAdmin(supabase, user.id))) return new Response('Sem permissão.', { status: 403 });
  return Response.redirect(moloniAuthorizeUrl());
}
