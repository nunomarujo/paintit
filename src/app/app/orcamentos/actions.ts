'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import type { FormState } from '@/app/app/actions';
import { LINE_CATEGORIES, UNITS, type LineCategory, type Unit } from '@/domain/proposal';
import { chaveDe } from '@/domain/priceBook';
import { podeApagar } from '@/domain/quoteBoard';
import { linhasQueHerdam, trabalhosDoModelo } from '@/domain/quoteTemplates';
import { parseHundredths } from '@/domain/request';
import { learnPrices } from '@/lib/priceBook';
import { painterOrgs } from '@/lib/queries';
import { getUser } from '@/lib/supabase/server';

const fail = (field: string, message: string): FormState => ({ errors: { [field]: message } });
const isCategoria = (v: unknown): v is LineCategory => typeof v === 'string' && (LINE_CATEGORIES as readonly string[]).includes(v);
const isUnidade = (v: unknown): v is Unit => typeof v === 'string' && (UNITS as readonly string[]).includes(v);
const texto = (v: FormDataEntryValue | null, max: number) => String(v ?? '').trim().slice(0, max);

async function myOrg() {
  const { supabase, user } = await getUser();
  const orgs = await painterOrgs(supabase, user!.id);
  return { supabase, org: orgs[0] ?? null };
}

/**
 * Orçamento novo. Nunca começa em branco: ou vem de um modelo por tipo de obra, ou duplica um
 * orçamento anterior desta empresa. É esta regra que tira os 45 minutos de decidir o que entra.
 */
export async function createQuote(_prev: FormState, form: FormData): Promise<FormState> {
  const cliente = texto(form.get('cliente'), 160);
  if (cliente.length < 2) return fail('cliente', 'Indique o cliente — basta o nome do condomínio ou da pessoa.');
  const modelo = texto(form.get('modelo'), 40);
  const duplicarDe = texto(form.get('duplicar'), 40);

  const { supabase, org } = await myOrg();
  if (!org) return { errors: {}, message: 'Só uma empresa de pintura faz orçamentos.' };

  const { data: quote, error } = await supabase
    .from('painter_quotes')
    .insert({
      org_id: org.id,
      cliente_nome: cliente,
      local: texto(form.get('local'), 160) || null,
      titulo: texto(form.get('titulo'), 200) || null,
    })
    .select('id')
    .single();
  if (error || !quote) return { errors: {}, message: 'Não foi possível criar o orçamento.' };

  if (duplicarDe) {
    // Duplicar é o que ele já faz hoje à mão, abrindo o Word do orçamento anterior.
    const { data: antigas } = await supabase
      .from('painter_quote_lines')
      .select('categoria, descricao, unidade, quantidade, preco_unitario, demaos, produto, inclusao, ordem')
      .eq('quote_id', duplicarDe)
      .order('ordem');
    if (antigas && antigas.length > 0) {
      await supabase.from('painter_quote_lines').insert(antigas.map((l) => ({ ...l, quote_id: quote.id })));
    }
  } else if (modelo) {
    const trabalhos = trabalhosDoModelo(modelo);
    if (trabalhos.length > 0) {
      // O modelo traz os capítulos pela ordem de execução, sem quantidades nem preços: isso é dele.
      const { data: book } = await supabase.from('org_price_book').select('chave, preco_unitario').eq('org_id', org.id);
      const precos = new Map((book ?? []).map((b) => [b.chave, b.preco_unitario]));
      await supabase.from('painter_quote_lines').insert(
        trabalhos.map((w, i) => ({
          quote_id: quote.id,
          categoria: w.categoria,
          descricao: w.label,
          unidade: w.unit,
          trabalho: w.code,
          preco_unitario: precos.get(chaveDe(w.label, w.unit, w.code)) ?? 0,
          ordem: i,
        })),
      );
    }
  }

  redirect(`/app/orcamentos/${quote.id}`);
}

export async function addQuoteLine(quoteId: string, _prev: FormState, form: FormData): Promise<FormState> {
  const descricao = texto(form.get('descricao'), 300);
  if (descricao.length < 1) return fail('descricao', 'Descreva o trabalho.');
  const categoria = form.get('categoria');
  if (!isCategoria(categoria)) return fail('categoria', 'Escolha o capítulo.');
  const unidade = form.get('unidade');
  if (!isUnidade(unidade)) return fail('unidade', 'Escolha a unidade.');
  const quantidade = parseHundredths(form.get('quantidade')) ?? 0;
  const preco = parseHundredths(form.get('preco')) ?? 0;
  if (Number.isNaN(quantidade) || Number.isNaN(preco)) return fail('quantidade', 'Números em português (12,5).');

  const { supabase } = await myOrg();
  const { count } = await supabase.from('painter_quote_lines').select('id', { count: 'exact', head: true }).eq('quote_id', quoteId);
  const { error } = await supabase.from('painter_quote_lines').insert({
    quote_id: quoteId,
    categoria,
    descricao,
    unidade,
    quantidade: Math.max(0, quantidade),
    preco_unitario: Math.max(0, preco),
    ordem: count ?? 0,
  });
  if (error) return { errors: {}, message: 'Não foi possível acrescentar a linha.' };
  revalidatePath(`/app/orcamentos/${quoteId}`);
  return { errors: {}, ok: true, message: 'Linha acrescentada.' };
}

export async function updateQuoteLine(quoteId: string, lineId: string, _prev: FormState, form: FormData): Promise<FormState> {
  const quantidade = parseHundredths(form.get('quantidade')) ?? 0;
  const preco = parseHundredths(form.get('preco')) ?? 0;
  if (Number.isNaN(quantidade) || Number.isNaN(preco)) return fail('quantidade', 'Números em português (12,5).');
  const { supabase } = await myOrg();
  const { error } = await supabase
    .from('painter_quote_lines')
    .update({ quantidade: Math.max(0, quantidade), preco_unitario: Math.max(0, preco) })
    .eq('id', lineId)
    .eq('quote_id', quoteId);
  if (error) return { errors: {}, message: 'Não foi possível guardar.' };

  // A primeira área escrita enche as linhas em m² que ainda estão por preencher. Numa fachada de
  // 30 m², o primário e a pintura são os mesmos 30 m²: escrevê-lo sete vezes é trabalho que a
  // aplicação pode poupar (pedido do promotor, 25/10/2026). Nunca mexe numa quantidade já escrita.
  const { data: todas } = await supabase
    .from('painter_quote_lines')
    .select('id, unidade, quantidade')
    .eq('quote_id', quoteId);
  // A unidade lê-se da base e não do formulário: o que vem do navegador não decide nada (regra 10).
  const origem = (todas ?? []).find((l) => l.id === lineId);
  const herdeiras = origem ? linhasQueHerdam(todas ?? [], { ...origem, quantidade }) : [];
  if (herdeiras.length > 0) {
    await supabase.from('painter_quote_lines').update({ quantidade }).in('id', herdeiras);
  }

  revalidatePath(`/app/orcamentos/${quoteId}`);
  return {
    errors: {},
    ok: true,
    message:
      herdeiras.length > 0
        ? `Guardado, e a mesma quantidade foi posta ${herdeiras.length === 1 ? 'na outra linha' : `nas outras ${herdeiras.length} linhas`} em m² que estavam por preencher.`
        : 'Guardado.',
  };
}

export async function removeQuoteLine(quoteId: string, lineId: string, _prev: FormState, _form: FormData): Promise<FormState> {
  const { supabase } = await myOrg();
  await supabase.from('painter_quote_lines').delete().eq('id', lineId).eq('quote_id', quoteId);
  revalidatePath(`/app/orcamentos/${quoteId}`);
  return { errors: {}, ok: true };
}

/** Condições: IVA, validade, duração, garantia, exclusões e notas. */
export async function saveQuoteTerms(quoteId: string, _prev: FormState, form: FormData): Promise<FormState> {
  const iva = Number(form.get('iva'));
  if (![0, 600, 1300, 2300].includes(iva)) return fail('iva', 'Escolha a taxa de IVA.');
  const duracao = String(form.get('duracao') ?? '').trim();
  const garantia = String(form.get('garantia') ?? '').trim();
  const { supabase } = await myOrg();
  const { error } = await supabase
    .from('painter_quotes')
    .update({
      iva_bps: iva,
      validade: /^\d{4}-\d{2}-\d{2}$/.test(String(form.get('validade') ?? '')) ? String(form.get('validade')) : null,
      duracao_dias: duracao === '' ? null : Math.max(1, Math.min(3650, Number(duracao) || 1)),
      garantia_anos: garantia === '' ? null : Math.max(0, Math.min(50, Number(garantia) || 0)),
      exclusoes: texto(form.get('exclusoes'), 2000),
      notas: texto(form.get('notas'), 2000),
    })
    .eq('id', quoteId);
  if (error) return { errors: {}, message: 'Não foi possível guardar as condições.' };
  revalidatePath(`/app/orcamentos/${quoteId}`);
  return { errors: {}, ok: true, message: 'Condições guardadas.' };
}

/**
 * Ligar ou desligar o seguimento deste orçamento.
 *
 * É o consentimento do pintor para a plataforma escrever ao cliente dele — três toques, ao 3.º, 10.º
 * e 20.º dia, e nada mais. Por omissão está desligado: escrever a um cliente de alguém não é coisa
 * que se faça por defeito.
 */
export async function setSeguimento(quoteId: string, ligar: boolean, _prev: FormState, _form: FormData): Promise<FormState> {
  const { supabase, org } = await myOrg();
  if (!org) return { errors: {}, message: 'Sem empresa.' };
  const { error } = await supabase.from('painter_quotes').update({ seguimento: ligar }).eq('id', quoteId).eq('org_id', org.id);
  // Sem o erro à vista, um botão que não grava parece um botão partido. Acontece enquanto a migração
  // do seguimento não estiver aplicada à base real.
  if (error) return { errors: {}, message: 'O seguimento ainda não está disponível nesta instalação.' };
  revalidatePath(`/app/orcamentos/${quoteId}`);
  return { errors: {}, ok: true, message: ligar ? 'A Quem Pinta passa a perguntar por si.' : 'Deixámos de perguntar.' };
}

/**
 * Dar o orçamento por enviado. É neste momento que a biblioteca de preços aprende: os preços com que
 * ele acabou são os que valem, e são eles que vão poupar-lhe tempo no orçamento seguinte.
 */
export async function markQuoteSent(quoteId: string, _prev: FormState, _form: FormData): Promise<FormState> {
  const { supabase, org } = await myOrg();
  if (!org) return { errors: {}, message: 'Sem empresa.' };

  const { data: linhas } = await supabase
    .from('painter_quote_lines')
    .select('categoria, descricao, unidade, preco_unitario, trabalho')
    .eq('quote_id', quoteId);
  await learnPrices(
    supabase,
    org.id,
    (linhas ?? []).map((l) => ({
      categoria: l.categoria,
      descricao: l.descricao,
      unidade: l.unidade,
      precoUnitario: l.preco_unitario,
      trabalho: l.trabalho,
    })),
  );

  await supabase.from('painter_quotes').update({ estado: 'enviado', enviado_em: new Date().toISOString() }).eq('id', quoteId);
  revalidatePath(`/app/orcamentos/${quoteId}`);
  return { errors: {}, ok: true, message: 'Orçamento dado como enviado. Os preços ficaram guardados para o próximo.' };
}

/** Resultado do orçamento. Ganho cria a obra, para as ferramentas de obra arrancarem com ele. */
export async function setQuoteOutcome(quoteId: string, estado: 'ganho' | 'perdido', _prev: FormState, _form: FormData): Promise<FormState> {
  if (estado !== 'ganho' && estado !== 'perdido') return { errors: {}, message: 'Estado inválido.' };
  const { supabase, org } = await myOrg();
  if (!org) return { errors: {}, message: 'Sem empresa.' };

  if (estado === 'ganho') {
    const { data: q } = await supabase.from('painter_quotes').select('*').eq('id', quoteId).maybeSingle();
    const { data: linhas } = await supabase.from('painter_quote_lines').select('quantidade, preco_unitario, inclusao, unidade').eq('quote_id', quoteId);
    const incluidas = (linhas ?? []).filter((l) => l.inclusao === 'incluido');
    const base = incluidas.reduce((n, l) => n + Math.round((l.quantidade * l.preco_unitario) / 100), 0);
    // A área vem das linhas em m²: é o que depois permite comparar o preço cobrado com o custo real.
    const area = incluidas.filter((l) => l.unidade === 'm2').reduce((n, l) => n + l.quantidade, 0);
    if (q && !q.worksite_id) {
      const { data: obra } = await supabase
        .from('worksites')
        .insert({
          org_id: org.id,
          nome: q.titulo || `Obra de ${q.cliente_nome}`,
          cliente_nome: q.cliente_nome,
          local: q.local,
          valor_cents: base,
          area_cm2: area > 0 ? area : null,
        })
        .select('id')
        .single();
      if (obra) await supabase.from('painter_quotes').update({ worksite_id: obra.id }).eq('id', quoteId);
    }
  }

  await supabase.from('painter_quotes').update({ estado }).eq('id', quoteId);
  revalidatePath(`/app/orcamentos/${quoteId}`);
  return { errors: {}, ok: true, message: estado === 'ganho' ? 'Obra criada a partir do orçamento.' : 'Registado.' };
}

/**
 * Apagar um orçamento.
 *
 * Só um rascunho ou um não ganho. Um enviado é a prova do que foi proposto ao cliente e um ganho deu
 * origem a uma obra — apagá-lo deixava-a sem princípio. O estado lê-se da base, não do navegador
 * (regra 10): quem chama isto não decide o que pode apagar.
 */
export async function removeQuote(quoteId: string, _prev: FormState, _form: FormData): Promise<FormState> {
  const { supabase } = await myOrg();
  const { data: q } = await supabase.from('painter_quotes').select('estado, numero').eq('id', quoteId).maybeSingle();
  if (!q) return { errors: {}, message: 'Esse orçamento já não existe.' };
  if (!podeApagar(q.estado)) {
    return {
      errors: {},
      message:
        q.estado === 'enviado'
          ? 'Um orçamento enviado não se apaga: é a prova do que propôs ao cliente. Pode registá-lo como não ganho.'
          : 'Este orçamento deu origem a uma obra e não se apaga. Apague a obra primeiro, se for esse o caso.',
    };
  }
  const { error } = await supabase.from('painter_quotes').delete().eq('id', quoteId);
  if (error) return { errors: {}, message: 'Não foi possível apagar.' };
  revalidatePath('/app/orcamentos');
  redirect('/app/orcamentos?ver=feitos');
}
