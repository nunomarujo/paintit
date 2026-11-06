import 'server-only';
import { createHash } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';
import { relatorioDoPercurso, type Destinatario, type EventoDoRegisto } from '@/domain/percursoNegocial';

type Client = SupabaseClient<Database>;

/**
 * Emite um relatório do percurso negocial (06/11/2026): lê o registo da obra com a chave de serviço,
 * gera o texto da versão pedida, resume-o (SHA-256) e guarda-o uma vez. Uma segunda emissão é uma versão
 * nova; a anterior fica. Quem chama já confirmou que é a equipa e, para o cliente, que quem pediu é parte.
 */
export async function emitirRelatorio(
  db: Client,
  o: { requestId: string; destinatario: Destinatario; pedidoId: string | null; emitidoPor: string },
): Promise<{ id: string; versao: number; sha256: string } | { erro: string }> {
  const { data: pedido } = await db.from('work_requests').select('id, org_id, ref').eq('id', o.requestId).maybeSingle();
  const { data: contratacoes } = await db
    .from('engagements')
    .select('id, painter_org_id, client_org_id, created_at')
    .eq('request_id', o.requestId)
    .order('created_at', { ascending: false });
  const clienteOrgId = pedido?.org_id ?? contratacoes?.[0]?.client_org_id ?? null;
  if (!clienteOrgId) return { erro: 'Pedido não encontrado.' };
  const vencedorOrgId = contratacoes?.[0]?.painter_org_id ?? null;

  const contas = [clienteOrgId, ...(vencedorOrgId ? [vencedorOrgId] : [])];
  const [{ data: daObra }, { data: dasContas }] = await Promise.all([
    db.from('registo_da_obra').select('*').eq('request_id', o.requestId).order('ordem'),
    db.from('registo_da_obra').select('*').eq('tipo', 'conta_aberta').in('org_id', contas).order('ordem'),
  ]);
  const linhas = [...(dasContas ?? []), ...(daObra ?? [])];
  const eventos: EventoDoRegisto[] = linhas.map((r) => ({
    ordem: Number(r.ordem),
    tipo: r.tipo,
    criadoEm: r.criado_em,
    orgId: r.org_id,
    painterOrgId: r.painter_org_id,
    dados: (r.dados ?? {}) as Record<string, unknown>,
  }));
  const ids = [...new Set(linhas.flatMap((r) => [r.org_id, r.painter_org_id]).filter((x): x is string => !!x))];
  const { data: orgs } = ids.length ? await db.from('organizations').select('id, nome').in('id', ids) : { data: [] };
  const nomes = Object.fromEntries((orgs ?? []).map((g) => [g.id, g.nome]));
  // Uma entidade já apagada fica com o nome que tinha na abertura de conta, se o registo o guardou.
  for (const r of linhas) if (r.tipo === 'conta_aberta' && r.org_id && !nomes[r.org_id]) nomes[r.org_id] = String((r.dados as { nome?: string })?.nome ?? 'Entidade');

  const { data: anteriores } = await db
    .from('relatorios_do_percurso')
    .select('versao')
    .eq('request_id', o.requestId)
    .eq('destinatario', o.destinatario)
    .order('versao', { ascending: false })
    .limit(1);
  const versao = (anteriores?.[0]?.versao ?? 0) + 1;
  const ref = pedido?.ref ?? String((linhas.find((r) => r.tipo === 'pedido_criado')?.dados as { ref?: string })?.ref ?? o.requestId.slice(0, 8));
  const conteudo = relatorioDoPercurso({ ref, destinatario: o.destinatario, versao, emitidoEm: new Date(), eventos, nomes, clienteOrgId, vencedorOrgId });
  const sha256 = createHash('sha256').update(conteudo).digest('hex');
  const { data, error } = await db
    .from('relatorios_do_percurso')
    .insert({ request_id: o.requestId, pedido_id: o.pedidoId, destinatario: o.destinatario, versao, conteudo, sha256, emitido_por: o.emitidoPor })
    .select('id')
    .single();
  if (error || !data) return { erro: 'Não foi possível guardar o relatório.' };
  return { id: data.id, versao, sha256 };
}
