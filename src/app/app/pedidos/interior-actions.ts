'use server';

import { revalidatePath } from 'next/cache';
import type { FormState } from '@/app/app/actions';
import { areasDaDivisao, lerInterior, nomeDaDivisao, totalDoInterior, VAO_MINIMO_INTERIOR_M2 } from '@/domain/interior';
import { confirmacaoDaOrigem } from '@/domain/request';
import { getUser } from '@/lib/supabase/server';

// Gravar o interior da habitação de um pedido em rascunho (06/11/2026; `src/domain/interior.ts`).
//
// O ecrã envia as divisões em JSON; aqui valida-se tudo de novo (regra 10), calculam-se as áreas com as
// funções do domínio (regra 2) e grava-se: as divisões em `request_rooms` (substituídas por inteiro, o
// pedido está em rascunho) e o resultado em duas zonas de `request_surfaces` — paredes interiores e,
// se houver, tetos — que é o que o resto da aplicação já sabe ler (total, anúncio, orçamento). As
// regras de acesso da base só deixam gravar em rascunho, a quem gere o pedido ou ao avaliador dele.
// A imagem da planta nunca chega aqui.

/** As duas zonas que o interior mantém. Reconhecem-se pela descrição, que é fixa. */
const DESCRICAO_PAREDES = 'Interior da habitação: paredes';
const DESCRICAO_TETOS = 'Interior da habitação: tetos';

export async function guardarInterior(requestId: string, _prev: FormState, form: FormData): Promise<FormState> {
  let bruto: unknown;
  try {
    bruto = JSON.parse(String(form.get('interior') ?? ''));
  } catch {
    return { errors: {}, message: 'Não foi possível ler as divisões. Tente de novo.' };
  }
  const lido = lerInterior(bruto);
  if (!lido.value) return { errors: {}, message: lido.erro };
  const v = lido.value;
  const { supabase, user } = await getUser();
  if (!user) return { errors: {}, message: 'A sessão expirou. Entre de novo.' };

  const { data: pedido } = await supabase.from('work_requests').select('id, status').eq('id', requestId).maybeSingle();
  if (!pedido) return { errors: {}, message: 'Pedido não encontrado.' };
  if (pedido.status !== 'rascunho') return { errors: {}, message: 'O pedido já foi publicado: as medidas só se alteram em rascunho.' };

  const cm = (m: number | null) => (m === null ? null : Math.round(m * 100));
  const linhas = v.divisoes.map((d, i) => {
    const a = areasDaDivisao(d, v.geral, v.modo);
    return {
      request_id: pedido.id,
      ordem: i,
      tipo: d.tipo,
      numero: d.numero,
      comprimento_cm: cm(d.comprimentoM),
      largura_cm: cm(d.larguraM),
      perimetro_cm: cm(d.perimetroM),
      pe_direito_cm: cm(d.peDireitoM),
      vaos: d.vaos.map((x) => ({ largura_cm: cm(x.larguraM), altura_cm: cm(x.alturaM), quantidade: x.quantidade })),
      pintar_paredes: d.pintarParedes,
      pintar_teto: d.pintarTeto,
      area_paredes_manual_cm2: cm(d.areaParedesManualM2),
      area_teto_manual_cm2: cm(d.areaTetoManualM2),
      cor_referencia: d.corReferencia,
      cor_hex: d.corHex,
      area_paredes_cm2: cm(a.paredesM2),
      area_teto_cm2: cm(a.tetoM2),
      certeza: a.falta.length > 0 && a.paredesM2 === null && a.tetoM2 === null ? 'desconhecida' : a.certeza,
      margem_bp: d.margem === null ? null : Math.round(d.margem * 10_000),
      vao_minimo_cm2: Math.round(VAO_MINIMO_INTERIOR_M2 * 100),
      registado_por: user.id,
    };
  });

  const del = await supabase.from('request_rooms').delete().eq('request_id', pedido.id);
  if (del.error) return { errors: {}, message: 'Não foi possível guardar. O pedido tem de estar em rascunho.' };
  if (linhas.length > 0) {
    const ins = await supabase.from('request_rooms').insert(linhas);
    if (ins.error) return { errors: {}, message: 'Não foi possível guardar as divisões.' };
  }
  await supabase
    .from('work_requests')
    .update({ interior_modo: v.modo, interior_pe_direito_cm: cm(v.geral.metros), interior_pe_direito_corrente: v.geral.aceiteComoCorrente })
    .eq('id', pedido.id);

  // As duas zonas de resultado. Origem: planta (desenho ou planta enviada) ou medição do cliente (manual);
  // quantidade medida, estimada (planta à escala ou pé-direito corrente) ou por medir.
  const total = totalDoInterior(v.divisoes, v.geral, v.modo);
  const origem: 'medicao_cliente' | 'planta' = v.modo === 'manual' ? 'medicao_cliente' : 'planta';
  const origemQuantidade: 'estimativa' | 'medicao' = total.certeza === 'estimada' ? 'estimativa' : 'medicao';
  const nomes = v.divisoes.filter((d) => d.pintarParedes).map((d) => nomeDaDivisao(d, true));
  const zonas = [
    { kind: 'paredes_interiores' as const, descricao: DESCRICAO_PAREDES, area: total.paredesM2, observacoes: nomes.join(', ') || null },
    { kind: 'tetos' as const, descricao: DESCRICAO_TETOS, area: total.tetosM2, observacoes: null },
  ];
  for (const z of zonas) {
    const { data: existente } = await supabase.from('request_surfaces').select('id').eq('request_id', pedido.id).eq('descricao', z.descricao).maybeSingle();
    if (z.area <= 0) {
      if (existente) await supabase.from('request_surfaces').delete().eq('id', existente.id);
      continue;
    }
    const colunas = {
      kind: z.kind,
      descricao: z.descricao,
      area_direta_cm2: Math.round(z.area * 100),
      largura_cm: null,
      altura_cm: null,
      vaos_cm2: null,
      quantidade: 1,
      origem,
      origem_quantidade: origemQuantidade,
      confirmacao: confirmacaoDaOrigem(origemQuantidade),
      observacoes: z.observacoes,
    };
    const r = existente
      ? await supabase.from('request_surfaces').update(colunas).eq('id', existente.id)
      : await supabase.from('request_surfaces').insert({ request_id: pedido.id, ...colunas, registado_por: user.id, registado_em: new Date().toISOString() });
    if (r.error) return { errors: {}, message: 'As divisões ficaram guardadas, mas a área total não. Tente guardar de novo.' };
  }
  revalidatePath(`/app/pedidos/${pedido.id}`);
  revalidatePath('/app/levantamentos', 'layout');
  return {
    errors: {},
    ok: true,
    message: `Guardado: ${total.paredesM2.toLocaleString('pt-PT')} m² de paredes${total.tetosM2 > 0 ? ` e ${total.tetosM2.toLocaleString('pt-PT')} m² de tetos` : ''}${
      total.porMedir > 0 ? `; ${total.porMedir} ${total.porMedir === 1 ? 'divisão' : 'divisões'} por medir` : ''
    }.`,
  };
}
