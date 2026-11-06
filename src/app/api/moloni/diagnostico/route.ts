import { isPlatformAdmin } from '@/lib/access';
import { diagnosticoMoloni } from '@/lib/moloni';
import { getUser } from '@/lib/supabase/server';

// Só no ramo moloni-teste (ensaio): o que a API da Moloni vê na empresa configurada (séries, impostos, clientes).
// Serve para confirmar os identificadores do ambiente. Só a equipa; não devolve segredos.
export async function GET() {
  const { supabase, user } = await getUser();
  if (!user || !(await isPlatformAdmin(supabase, user.id))) return new Response('Sem permissão.', { status: 403 });
  try {
    return Response.json(await diagnosticoMoloni());
  } catch (e) {
    return Response.json({ erro: e instanceof Error ? e.message : String(e) }, { status: 502 });
  }
}
