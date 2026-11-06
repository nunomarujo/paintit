import { isPlatformAdmin } from '@/lib/access';
import { listarEmpresasMoloni } from '@/lib/moloni';
import { getUser } from '@/lib/supabase/server';

// Só no ramo moloni-teste (ensaio): diz que empresas vê o token da Moloni e o `company_id` de cada uma.
// Serve para confirmar o MOLONI_COMPANY_ID. Não devolve nenhum segredo.
export async function GET() {
  const { supabase, user } = await getUser();
  if (!user || !(await isPlatformAdmin(supabase, user.id))) return new Response('Sem permissão.', { status: 403 });
  try {
    return Response.json(await listarEmpresasMoloni());
  } catch (e) {
    return Response.json({ erro: e instanceof Error ? e.message : String(e) }, { status: 502 });
  }
}
