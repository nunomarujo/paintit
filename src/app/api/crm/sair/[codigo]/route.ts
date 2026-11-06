import { adminClient } from '@/lib/supabase/admin';

/**
 * «Não quero receber mais mensagens». O GET só mostra a página com um botão (antivírus e pré-visualizadores de link
 * seguem links e desinscreveriam toda a gente); a desistência regista-se no POST, que é também o do «List-Unsubscribe-Post»
 * de um clique. Tem de funcionar sempre, sem sessão.
 */
const pagina = (corpo: string) =>
  new Response(
    `<!doctype html><html lang="pt-PT"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Quem Pinta</title></head><body style="font-family:Arial,sans-serif;max-width:480px;margin:48px auto;padding:0 16px;font-size:17px;color:#0b2540">${corpo}</body></html>`,
    { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } },
  );

const valido = (c: string) => /^[A-Z0-9]{8}$/.test(c);

export async function GET(_req: Request, { params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params;
  if (!valido(codigo)) return pagina('<p>Ligação inválida.</p>');
  return pagina(
    `<h1 style="font-size:24px">Deixar de receber mensagens</h1><p>Confirme para não voltar a receber mensagens da Quem Pinta.</p><form method="post"><button style="font-size:17px;padding:12px 24px;border-radius:999px;border:0;background:#0b2540;color:#fff;cursor:pointer">Confirmar</button></form>`,
  );
}

export async function POST(_req: Request, { params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params;
  if (!valido(codigo)) return pagina('<p>Ligação inválida.</p>');
  const db = adminClient();
  if (!db) return new Response('Indisponível', { status: 503 });
  const { data: c } = await db.from('crm_contactos').select('id, desistiu_em').eq('codigo', codigo).maybeSingle();
  if (c && !c.desistiu_em) {
    await db.from('crm_contactos').update({ desistiu_em: new Date().toISOString(), estado: 'desistiu' }).eq('id', c.id);
    await db.from('crm_eventos').insert({ contacto_id: c.id, tipo: 'desistencia' });
    // O que ainda não saiu deixa de sair.
    await db.from('crm_envios').update({ estado: 'rejeitado' }).eq('contacto_id', c.id).in('estado', ['proposto', 'aprovado']);
  }
  return pagina('<h1 style="font-size:24px">Feito</h1><p>Não voltará a receber mensagens da Quem Pinta.</p>');
}
