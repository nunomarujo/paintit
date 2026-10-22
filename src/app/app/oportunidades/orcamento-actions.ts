'use server';

import { revalidatePath } from 'next/cache';
import type { FormState } from '@/app/app/actions';
import { parseEuros } from '@/domain/proposal';
import { parseHundredths } from '@/domain/request';
import { buildTemplate, parseTemplate, templateToItems } from '@/domain/templates';
import { itemsFromLines, linesFromItems, parseWorkItems, type WorkItem, type Zone } from '@/domain/works';
import type { Json } from '@/lib/database.types';
import { toTerms } from '@/lib/proposals';
import { guardContact } from '@/lib/strikes';
import { getUser } from '@/lib/supabase/server';

const NOT_SIGNED_IN: FormState = { errors: {}, message: 'A sessão expirou. Entre de novo.' };

function readJson(form: FormData): unknown {
  try {
    return JSON.parse(String(form.get('payload') ?? ''));
  } catch {
    return null;
  }
}

type Supabase = Awaited<ReturnType<typeof getUser>>['supabase'];

/** Substitui as linhas dos trabalhos (não a do preço global). Devolve a mensagem de erro, ou null. */
async function writeWorkLines(supabase: Supabase, proposalId: string, items: WorkItem[], zones: Zone[], prices: Record<string, number>, globalMode: boolean): Promise<string | null> {
  const { error: delError } = await supabase.from('proposal_lines').delete().eq('proposal_id', proposalId).not('trabalho', 'is', null).neq('trabalho', 'global');
  if (delError) return 'Não foi possível guardar. Só gestores da entidade, com a proposta em rascunho.';
  const lines = linesFromItems(items, prices, zones, globalMode);
  if (lines.length > 0) {
    const byKey = new Map<string, WorkItem>(items.map((i) => [i.key, i]));
    const { error } = await supabase.from('proposal_lines').insert(
      lines.map((l, ordem) => {
        const it = byKey.get(l.key)!;
        const detalhes: Json = { key: l.key, ordem, estado: it.estado, zonas: it.zonas, campos: it.campos, quantidade: it.quantidade, notas: it.notas };
        return {
          proposal_id: proposalId,
          categoria: l.categoria,
          descricao: l.descricao,
          quantidade: l.quantidade,
          unidade: l.unidade,
          preco_unitario_cents: l.precoUnitario,
          inclusao: l.inclusao,
          produto: l.produto,
          demaos: l.demaos,
          surface_ids: l.zonas,
          trabalho: l.trabalho,
          detalhes,
        };
      }),
    );
    if (error) return 'Não foi possível guardar os trabalhos.';
  }
  return null;
}

// Orçamento guiado: os trabalhos escolhidos geram as linhas de preço (docs/PROPOSTA.md, fase 3).
// Tudo o que vem do navegador é validado aqui; as políticas da base de dados garantem quem e quando.

export async function saveWorks(proposalId: string, requestId: string, _prev: FormState, form: FormData): Promise<FormState> {
  const { supabase, user } = await getUser();
  if (!user) return NOT_SIGNED_IN;
  const { data: surfaces } = await supabase.from('request_surfaces').select('id, descricao, kind, area_cm2').eq('request_id', requestId).order('created_at');
  const zones: Zone[] = (surfaces ?? []).map((s) => ({ id: s.id, label: s.descricao?.trim() || s.kind, area: s.area_cm2 }));
  const parsed = parseWorkItems(readJson(form), zones);
  if (!parsed.items) return { errors: {}, message: parsed.errors[0] ?? 'Dados inválidos.' };

  const texts: Record<string, string> = {};
  for (const i of parsed.items) {
    for (const [k, v] of Object.entries(i.campos)) texts[`${i.key}.${k}`] = v;
    texts[`${i.key}.notas`] = i.notas;
  }
  const refused = await guardContact(supabase, user.id, 'trabalhos do orçamento', texts);
  if (refused) return { ...refused, message: 'Há texto com contactos, localização ou convite para sair da plataforma. Retire-o.' };

  const { data: prop } = await supabase.from('proposals').select('modo_preco, status').eq('id', proposalId).maybeSingle();
  if (!prop || prop.status !== 'rascunho') return { errors: {}, message: 'Só um rascunho se altera.' };
  const { data: old } = await supabase.from('proposal_lines').select('preco_unitario_cents, detalhes, trabalho').eq('proposal_id', proposalId).not('trabalho', 'is', null).neq('trabalho', 'global');
  const prices: Record<string, number> = {};
  for (const l of old ?? []) {
    const key = (l.detalhes as { key?: string } | null)?.key;
    if (key) prices[key] = l.preco_unitario_cents;
  }

  const failed = await writeWorkLines(supabase, proposalId, parsed.items, zones, prices, prop.modo_preco === 'global');
  if (failed) return { errors: {}, message: failed };
  revalidatePath(`/app/oportunidades/${requestId}`);
  return { errors: {}, ok: true, message: 'Trabalhos guardados.' };
}

interface PricesPayload {
  modo?: unknown;
  global?: unknown;
  iva?: unknown;
  prices?: unknown;
}

export async function savePrices(proposalId: string, requestId: string, _prev: FormState, form: FormData): Promise<FormState> {
  const { supabase, user } = await getUser();
  if (!user) return NOT_SIGNED_IN;
  const raw = (readJson(form) ?? {}) as PricesPayload;
  const modo = raw.modo === 'global' ? 'global' : 'detalhado';
  const iva = parseHundredths(String(raw.iva ?? '23'));
  if (iva === null || Number.isNaN(iva) || iva < 0 || iva > 3000) return { errors: {}, message: 'IVA entre 0% e 30%.' };
  const global = parseEuros(String(raw.global ?? ''));
  if (modo === 'global' && (global === null || Number.isNaN(global) || global <= 0)) return { errors: {}, message: 'Indique o preço global da obra, sem IVA.' };

  const { data: prop } = await supabase.from('proposals').select('status').eq('id', proposalId).maybeSingle();
  if (!prop || prop.status !== 'rascunho') return { errors: {}, message: 'Só um rascunho se altera.' };
  const { data: lines } = await supabase.from('proposal_lines').select('id, inclusao, detalhes').eq('proposal_id', proposalId).not('trabalho', 'is', null).neq('trabalho', 'global');
  const input = (raw.prices ?? {}) as Record<string, unknown>;
  for (const l of lines ?? []) {
    const key = (l.detalhes as { key?: string } | null)?.key ?? '';
    const priced = modo === 'detalhado' && l.inclusao !== 'nao_incluido';
    const v = priced ? parseEuros(String(input[key] ?? '')) : 0;
    if (v === null || Number.isNaN(v) || v < 0 || v > 100_000_000) return { errors: {}, message: 'Preço em euros, com até 2 casas decimais.' };
    const { error } = await supabase.from('proposal_lines').update({ preco_unitario_cents: v }).eq('id', l.id);
    if (error) return { errors: {}, message: 'Não foi possível guardar os preços.' };
  }
  await supabase.from('proposal_lines').delete().eq('proposal_id', proposalId).eq('trabalho', 'global');
  if (modo === 'global') {
    const { error } = await supabase.from('proposal_lines').insert({
      proposal_id: proposalId,
      categoria: 'outro',
      descricao: 'Preço global da obra',
      quantidade: 100,
      unidade: 'vg',
      preco_unitario_cents: global!,
      inclusao: 'incluido',
      trabalho: 'global',
    });
    if (error) return { errors: {}, message: 'Não foi possível guardar o preço global.' };
  }
  const { error } = await supabase.from('proposals').update({ iva_bps: iva, modo_preco: modo }).eq('id', proposalId);
  if (error) return { errors: {}, message: 'Não foi possível guardar o IVA.' };
  revalidatePath(`/app/oportunidades/${requestId}`);
  return { errors: {}, ok: true, message: 'Preços guardados.' };
}

// Métodos de trabalho (work_templates): trabalhos, preços e condições habituais da entidade.

export async function saveTemplate(proposalId: string, requestId: string, nome: string): Promise<FormState> {
  const { supabase, user } = await getUser();
  if (!user) return NOT_SIGNED_IN;
  const name = String(nome ?? '').trim().slice(0, 60);
  if (!name) return { errors: {}, message: 'Dê um nome ao método.' };
  const { data: prop } = await supabase.from('proposals').select('*').eq('id', proposalId).maybeSingle();
  if (!prop) return { errors: {}, message: 'Proposta não encontrada.' };
  const { data: lines } = await supabase.from('proposal_lines').select('preco_unitario_cents, detalhes, trabalho').eq('proposal_id', proposalId).not('trabalho', 'is', null).neq('trabalho', 'global');
  const items = itemsFromLines((lines ?? []).map((l) => ({ trabalho: l.trabalho, detalhes: l.detalhes })));
  if (items.length === 0) return { errors: {}, message: 'Escolha primeiro os trabalhos que quer guardar.' };
  const priceByKey: Record<string, number> = {};
  for (const l of lines ?? []) {
    const key = (l.detalhes as { key?: string } | null)?.key;
    if (key) priceByKey[key] = l.preco_unitario_cents;
  }
  const t = toTerms(prop);
  const data = buildTemplate(items, priceByKey, {
    ivaBps: t.ivaBps,
    adiantamentoBps: t.adiantamentoBps,
    garantiaAnos: t.garantiaAnos,
    precoAjusteM2: t.precoAjusteM2,
    exclusoes: t.exclusoes,
    notas: t.notas,
    fases: t.fases,
    seguroRc: t.seguroRc,
    seguroAt: t.seguroAt,
    confirmaMaoObra: t.confirmaMaoObra,
  });
  const { error } = await supabase
    .from('work_templates')
    .upsert({ org_id: prop.painter_org_id, nome: name, dados: data as unknown as Json, updated_at: new Date().toISOString() }, { onConflict: 'org_id,nome' });
  if (error) return { errors: {}, message: 'Não foi possível guardar o método. Só gestores da entidade o podem fazer.' };
  revalidatePath(`/app/oportunidades/${requestId}`);
  return { errors: {}, ok: true, message: `Método “${name}” guardado.` };
}

export async function applyTemplate(proposalId: string, requestId: string, templateId: string): Promise<FormState> {
  const { supabase, user } = await getUser();
  if (!user) return NOT_SIGNED_IN;
  const { data: prop } = await supabase.from('proposals').select('status, painter_org_id, modo_preco').eq('id', proposalId).maybeSingle();
  if (!prop || prop.status !== 'rascunho') return { errors: {}, message: 'Só um rascunho se altera.' };
  const { data: row } = await supabase.from('work_templates').select('dados, org_id, nome').eq('id', String(templateId)).maybeSingle();
  if (!row || row.org_id !== prop.painter_org_id) return { errors: {}, message: 'Método não encontrado.' };
  const t = parseTemplate(row.dados);
  const { data: surfaces } = await supabase.from('request_surfaces').select('id, descricao, kind, area_cm2').eq('request_id', requestId).order('created_at');
  const zones: Zone[] = (surfaces ?? []).map((s) => ({ id: s.id, label: s.descricao?.trim() || s.kind, area: s.area_cm2 }));
  const failed = await writeWorkLines(supabase, proposalId, templateToItems(t, zones), zones, t.prices, prop.modo_preco === 'global');
  if (failed) return { errors: {}, message: failed };
  const { error } = await supabase
    .from('proposals')
    .update({
      iva_bps: t.terms.ivaBps,
      adiantamento_bps: t.terms.adiantamentoBps,
      garantia_anos: t.terms.garantiaAnos,
      preco_ajuste_m2_cents: t.terms.precoAjusteM2,
      exclusoes: t.terms.exclusoes,
      notas: t.terms.notas,
      fases: t.terms.fases.map((f) => ({ nome: f.nome, bps: f.bps })) as Json,
      seguro_rc: t.terms.seguroRc,
      seguro_at: t.terms.seguroAt,
      confirma_mao_obra: t.terms.confirmaMaoObra,
    })
    .eq('id', proposalId)
    .eq('status', 'rascunho');
  if (error) return { errors: {}, message: 'Os trabalhos foram aplicados, mas não as condições.' };
  revalidatePath(`/app/oportunidades/${requestId}`);
  return { errors: {}, ok: true, message: `Método “${row.nome}” aplicado. Ajuste as quantidades, as zonas e os preços a esta obra.` };
}

export async function deleteTemplate(requestId: string, templateId: string): Promise<FormState> {
  const { supabase, user } = await getUser();
  if (!user) return NOT_SIGNED_IN;
  const { data, error } = await supabase.from('work_templates').delete().eq('id', String(templateId)).select('id');
  if (error || !data || data.length === 0) return { errors: {}, message: 'Não foi possível apagar o método.' };
  revalidatePath(`/app/oportunidades/${requestId}`);
  return { errors: {}, ok: true, message: 'Método apagado.' };
}

/** Código de adesão de um fornecedor: aplica-se (ou retira-se, com texto vazio) ao rascunho. A base de dados valida tudo. */
export async function applyReferral(proposalId: string, requestId: string, code: string): Promise<FormState & { applied?: boolean }> {
  const { supabase, user } = await getUser();
  if (!user) return NOT_SIGNED_IN;
  const text = String(code ?? '').replace(/[\s-]/g, '').toUpperCase();
  if (text.length > 12) return { errors: {}, message: 'Código inválido ou desativado.' };
  const { data, error } = await supabase.rpc('apply_referral_code', { p_proposal: proposalId, p_code: text || null });
  if (error) return { errors: {}, message: error.message };
  revalidatePath(`/app/oportunidades/${requestId}`);
  if (!text) return { errors: {}, ok: true, applied: false, message: 'Nenhum fornecedor associado a esta obra.' };
  return { errors: {}, ok: true, applied: true, message: `${data ?? 'Fornecedor'} associado a esta obra.` };
}
