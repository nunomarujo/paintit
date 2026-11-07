import { timingSafeEqual } from 'node:crypto';
import { tratarMensagemRecebida } from '@/lib/crmEntrada';
import { adminClient } from '@/lib/supabase/admin';

/**
 * Ponto de entrada das respostas aos emails do CRM (06/11/2026). Quem lê a caixa de correio (um filtro do Gmail com um script,
 * um serviço de email recebido, uma automação) entrega aqui cada mensagem, em JSON: `{ de, assunto, texto, messageId }`, com
 * `Authorization: Bearer <CRM_ENTRADA_SEGREDO>`. O segredo não está no código; sem ele definido, o ponto de entrada fecha.
 */
const segredoCerto = (recebido: string | null) => {
  const esperado = process.env.CRM_ENTRADA_SEGREDO;
  if (!esperado || !recebido) return false;
  const a = Buffer.from(recebido);
  const b = Buffer.from(`Bearer ${esperado}`);
  return a.length === b.length && timingSafeEqual(a, b);
};

export async function POST(req: Request) {
  if (!segredoCerto(req.headers.get('authorization'))) return new Response('Não autorizado', { status: 401 });
  const db = adminClient();
  if (!db) return new Response('Não configurado', { status: 503 });
  const bruto = await req.text();
  if (bruto.length > 200_000) return new Response('Demasiado grande', { status: 413 });
  let corpo: Record<string, unknown>;
  try {
    corpo = JSON.parse(bruto) as Record<string, unknown>;
  } catch {
    return new Response('JSON inválido', { status: 400 });
  }
  const texto = (v: unknown) => (typeof v === 'string' ? v : '');
  const de = texto(corpo.de);
  if (!de || !texto(corpo.texto)) return new Response('Faltam «de» e «texto»', { status: 400 });
  try {
    const r = await tratarMensagemRecebida(db, { de, assunto: texto(corpo.assunto), texto: texto(corpo.texto), messageId: texto(corpo.messageId) || undefined });
    return Response.json(r);
  } catch (err) {
    console.error('crm entrada:', err);
    return new Response('Erro a guardar', { status: 500 });
  }
}
