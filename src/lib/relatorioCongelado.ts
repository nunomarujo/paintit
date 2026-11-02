import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Json } from '@/lib/database.types';
import { compareProposals } from '@/domain/proposal';
import { trabalhosDaProposta } from '@/domain/comparador';
import { localDate } from '@/domain/deadline';
import { CURRENT_RULES } from '@/domain/rules';
import type { DesiredWork } from '@/domain/request';
import {
  construirRelatorioCongelado,
  documentoEmDia,
  materialPrincipalSugerido,
  type DadosDaPropostaParaRelatorio,
} from '@/domain/relatorioCongelado';
import { toLine } from './proposals';

/**
 * Gera (ou devolve, se já existir) a fotografia congelada de um pedido, e os dados para reler
 * outras vezes — ver `src/domain/relatorioCongelado.ts` para o porquê da forma.
 */

/** `aleatorio()` criptograficamente forte, no formato que o domínio pede: um valor em [0, 1) por chamada. */
function aleatorioCriptografico(): () => number {
  return () => {
    const buf = new Uint32Array(1);
    crypto.getRandomValues(buf);
    return buf[0]! / 2 ** 32;
  };
}

export interface RelatorioGuardado {
  id: string;
  token: string;
  codigoObra: string;
  numeroDePropostas: number;
  geradoEm: string;
}

async function lerRelatorioExistente(
  supabase: SupabaseClient<Database>,
  requestId: string,
): Promise<RelatorioGuardado | null> {
  const { data } = await supabase
    .from('relatorios_de_propostas')
    .select('id, token, codigo_obra, numero_de_propostas, gerado_em')
    .eq('request_id', requestId)
    .maybeSingle();
  if (!data) return null;
  return { id: data.id, token: data.token, codigoObra: data.codigo_obra, numeroDePropostas: data.numero_de_propostas, geradoEm: data.gerado_em };
}

/**
 * O material do catálogo cujo nome mais se aproxima do texto livre que a proposta usou — decisão de
 * desenho (a especificação não diz como ligar "material principal sugerido" a um "preço de
 * referência"; não há um ID de catálogo gravado por trabalho, só o nome em texto livre). Em caso de
 * ambiguidade ou produto não identificado, devolve `null` — mostra-se "—", nunca um preço errado.
 */
function precoDeReferenciaPara(
  nomeProposto: string | null,
  catalogo: readonly { marca: string; nome: string; precoReferenciaCents: number | null }[],
): number | null {
  if (!nomeProposto) return null;
  const alvo = nomeProposto.trim().toLocaleLowerCase('pt-PT');
  if (!alvo) return null;
  const achado = catalogo.find((p) => {
    const nome = p.nome.toLocaleLowerCase('pt-PT');
    const completo = `${p.marca} ${p.nome}`.toLocaleLowerCase('pt-PT');
    return alvo === completo || alvo.includes(nome) || completo.includes(alvo);
  });
  return achado?.precoReferenciaCents ?? null;
}

/**
 * Busca os dados de todas as propostas submetidas (não retiradas) deste pedido, já na forma que
 * `construirRelatorioCongelado` pede. `null` quando não há nenhuma — não vale a pena gerar um
 * relatório de zero propostas, e é melhor dizer isso no ecrã do que gravar uma fotografia vazia.
 */
async function dadosParaGerar(
  supabase: SupabaseClient<Database>,
  requestId: string,
): Promise<DadosDaPropostaParaRelatorio[] | null> {
  const { data: req } = await supabase.from('work_requests').select('trabalhos').eq('id', requestId).maybeSingle();
  const { data: proposals } = await supabase.from('proposals').select('*').eq('request_id', requestId).neq('status', 'rascunho');
  // Mesmo filtro de `relatorio/page.tsx`: submetida, não retirada. Uma proposta retirada não entra
  // na fotografia — não houve, para a assembleia, nada para comparar.
  const list = (proposals ?? []).filter((p) => p.status !== 'retirada');
  if (!req || list.length === 0) return null;

  const ids = list.map((p) => p.id);
  const painterOrgIds = [...new Set(list.map((p) => p.painter_org_id))];
  const [{ data: lines }, ratings, { data: docs }, { data: catalogo }] = await Promise.all([
    supabase.from('proposal_lines').select('*').in('proposal_id', ids),
    Promise.all(ids.map(async (pid) => [pid, (await supabase.rpc('painter_rating', { p_proposal: pid })).data?.[0] ?? null] as const)),
    supabase
      .from('org_documents')
      .select('org_id, kind, status, valido_ate')
      .in('org_id', painterOrgIds)
      .in('kind', ['declaracao_nao_divida_at', 'declaracao_nao_divida_ss']),
    supabase.from('reference_products').select('marca, nome, preco_referencia_cents'),
  ]);
  const ratingOf = new Map(ratings);
  const linesOf = (pid: string) => (lines ?? []).filter((l) => l.proposal_id === pid).map(toLine);
  const trabalhos = (req.trabalhos ?? []) as DesiredWork[];
  const catalogoEmDominio = (catalogo ?? []).map((p) => ({ marca: p.marca, nome: p.nome, precoReferenciaCents: p.preco_referencia_cents }));

  const rows = compareProposals(
    list.map((p) => ({ id: p.id, lines: linesOf(p.id), ivaBps: p.iva_bps, duracaoDias: p.duracao_dias, inicioPossivel: p.inicio_possivel, adiantamentoBps: p.adiantamento_bps })),
    { areaTotal: 0, superficies: [] },
  );
  const totalOf = new Map(rows.map((r) => [r.id, r.totals.totalComIva]));

  const hoje = localDate(new Date(), CURRENT_RULES.timeZone);
  const docsOf = (orgId: string, kind: string) => {
    const d = (docs ?? []).find((x) => x.org_id === orgId && x.kind === kind);
    return d ? { status: d.status, validoAte: d.valido_ate } : undefined;
  };

  return list.map((p) => {
    const trabalhosDaOferta = trabalhosDaProposta(trabalhos, linesOf(p.id));
    const material = materialPrincipalSugerido(trabalhosDaOferta);
    return {
      id: p.id,
      precoComIvaCents: totalOf.get(p.id) ?? 0,
      // Sem campo próprio em lugar nenhum dos dados actuais — ver ressalva no relatório final.
      anosExperiencia: null,
      garantiaAnos: p.garantia_anos,
      reputacao: ratingOf.get(p.id) ?? null,
      prazoExecucaoDias: p.duracao_dias,
      trabalhos: trabalhosDaOferta,
      precoReferenciaCents: precoDeReferenciaPara(material, catalogoEmDominio),
      // A habilitação (alvará/certificado IMPIC) já fica fixada na proposta no momento da submissão
      // (`proposals.habilitacao_ok`, migração `habilitacao`) — mais rigoroso do que reler os
      // documentos agora, e já era essa a convenção do resto da app (badge "Documentos validados").
      alvara: { emDia: Boolean(p.habilitacao_ok), validoAte: null },
      naoDividaAt: documentoEmDia(docsOf(p.painter_org_id, 'declaracao_nao_divida_at'), hoje),
      naoDividaSs: documentoEmDia(docsOf(p.painter_org_id, 'declaracao_nao_divida_ss'), hoje),
      submetidaEm: p.submitted_at,
      validaAte: p.validade,
    };
  });
}

/**
 * Devolve a fotografia já gerada para este pedido, ou gera-a agora. Chamar isto é seguro mesmo que
 * já exista (devolve a mesma) e mesmo em duas sessões ao mesmo tempo: a restrição única de
 * `request_id` deixa só uma geração vencer, e a segunda lê o que a primeira gravou.
 */
export async function obterOuGerarRelatorioCongelado(
  supabase: SupabaseClient<Database>,
  requestId: string,
): Promise<RelatorioGuardado | null> {
  const existente = await lerRelatorioExistente(supabase, requestId);
  if (existente) return existente;

  const dados = await dadosParaGerar(supabase, requestId);
  if (!dados) return null;

  const relatorio = construirRelatorioCongelado(dados, aleatorioCriptografico());

  const { data: cabecalho, error } = await supabase
    .from('relatorios_de_propostas')
    .insert({
      request_id: requestId,
      codigo_obra: relatorio.codigoObra,
      numero_de_propostas: relatorio.numeroDePropostas,
      aviso_integridade: relatorio.avisoDeIntegridade,
    })
    .select('id, token, codigo_obra, numero_de_propostas, gerado_em')
    .single();

  if (error || !cabecalho) {
    // Conflito com a restrição única (outra sessão gerou primeiro), ou a janela de entrega fechou-se
    // entretanto do lado da regra de acesso: nos dois casos, o que importa é reler o que existe.
    const jaExiste = await lerRelatorioExistente(supabase, requestId);
    if (jaExiste) return jaExiste;
    throw error ?? new Error('Não foi possível gerar o relatório de propostas.');
  }

  const fichas = relatorio.fichas.map(({ numero, codigoPagina, ...resto }) => ({
    relatorio_id: cabecalho.id,
    numero,
    codigo_pagina: codigoPagina,
    dados: resto as unknown as Json,
  }));
  const { error: errFichas } = await supabase.from('relatorios_de_propostas_fichas').insert(fichas);
  if (errFichas) throw errFichas;

  return {
    id: cabecalho.id,
    token: cabecalho.token,
    codigoObra: cabecalho.codigo_obra,
    numeroDePropostas: cabecalho.numero_de_propostas,
    geradoEm: cabecalho.gerado_em,
  };
}
