'use server';

import { revalidatePath } from 'next/cache';
import type { FormState } from '@/app/app/actions';
import { autoMatch, parseBankFile, type BankLine } from '@/domain/accounting/bank';
import { isPlatformAdmin } from '@/lib/access';
import type { Database } from '@/lib/database.types';
import { getUser } from '@/lib/supabase/server';

type BankPatch = Database['public']['Tables']['bank_lines']['Update'];

// Importação do extrato (src/domain/accounting/bank.ts). Tudo corre com a sessão da equipa: as políticas RLS recusam qualquer outra pessoa.

const MAX_BYTES = 3 * 1024 * 1024;
const PAGE = '/app/backoffice/contabilidade';
// Revalida a secção inteira (todos os sub-separadores).

async function admin() {
  const { supabase, user } = await getUser();
  if (!user || !(await isPlatformAdmin(supabase, user.id))) return null;
  return supabase;
}

function decode(buf: ArrayBuffer): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buf);
  } catch {
    // Muitos bancos exportam em ISO-8859-1 / Windows-1252.
    return new TextDecoder('windows-1252').decode(buf);
  }
}

export async function importBankFileAction(_prev: FormState, form: FormData): Promise<FormState> {
  const supabase = await admin();
  if (!supabase) return { errors: {}, message: 'Sem permissão.' };
  const file = form.get('ficheiro');
  if (!(file instanceof File) || file.size === 0) return { errors: { ficheiro: 'Escolha o ficheiro do extrato.' } };
  if (file.size > MAX_BYTES) return { errors: { ficheiro: 'Ficheiro demasiado grande (máximo 3 MB).' } };
  const parsed = parseBankFile(decode(await file.arrayBuffer()));
  if (parsed.lines.length === 0) return { errors: {}, message: parsed.errors[0] ?? 'Não encontrei movimentos no ficheiro.' };

  // Só entram os movimentos que ainda não existem (importar um extrato que se sobrepõe a outro não duplica).
  const existing = new Set<string>();
  for (let i = 0; i < parsed.lines.length; i += 200) {
    const chunk = parsed.lines.slice(i, i + 200).map((l) => l.chave);
    const { data } = await supabase.from('bank_lines').select('chave').in('chave', chunk);
    for (const r of data ?? []) existing.add(r.chave);
  }
  const fresh: BankLine[] = parsed.lines.filter((l) => !existing.has(l.chave));
  const dates = parsed.lines.map((l) => l.data).sort();
  const { data: imp, error } = await supabase
    .from('bank_imports')
    .insert({ ficheiro: file.name.slice(0, 200), formato: parsed.formato, iban: parsed.iban, linhas: parsed.lines.length, novas: fresh.length, duplicadas: parsed.lines.length - fresh.length, de: dates[0], ate: dates[dates.length - 1] })
    .select('id')
    .single();
  if (error || !imp) return { errors: {}, message: 'Não foi possível guardar a importação.' };
  for (let i = 0; i < fresh.length; i += 200) {
    const { error: e } = await supabase.from('bank_lines').insert(
      fresh.slice(i, i + 200).map((l) => ({ import_id: imp.id, chave: l.chave, data: l.data, data_valor: l.dataValor, descricao: l.descricao, valor_cents: l.valorCents, saldo_cents: l.saldoCents })),
    );
    if (e) return { errors: {}, message: `Importação incompleta: ${e.message}` };
  }

  const matched = await runAutoMatch();
  revalidatePath(PAGE, 'layout');
  const warn = parsed.errors.length ? ` ${parsed.errors.length} linha(s) ignoradas por erro de leitura (${parsed.errors[0]}).` : '';
  return { errors: {}, ok: true, message: `${fresh.length} movimentos novos, ${parsed.lines.length - fresh.length} já existentes; ${matched} casados automaticamente.${warn}` };
}

/** Casa o que é inequívoco: entradas da Stripe e pagamentos de resgates. */
async function runAutoMatch(): Promise<number> {
  const supabase = await admin();
  if (!supabase) return 0;
  const [{ data: lines }, { data: payouts }, { data: reds }, { data: linked }] = await Promise.all([
    supabase.from('bank_lines').select('chave, data, valor_cents, descricao').eq('classificacao', 'por_classificar'),
    supabase.from('stripe_payouts').select('id, amount_cents, arrival_at').eq('status', 'paid').eq('currency', 'eur'),
    supabase.from('referral_redemptions').select('id, liquido_cents, paga_em, titular').eq('estado', 'paga'),
    supabase.from('bank_lines').select('stripe_payout_id, redemption_id').or('stripe_payout_id.not.is.null,redemption_id.not.is.null'),
  ]);
  const matches = autoMatch(
    (lines ?? []).map((l) => ({ chave: l.chave, data: l.data, valorCents: l.valor_cents, descricao: l.descricao })),
    {
      payouts: (payouts ?? []).map((p) => ({ id: p.id, amountCents: p.amount_cents, arrivalAt: p.arrival_at })),
      redemptions: (reds ?? []).map((r) => ({ id: r.id, liquidoCents: r.liquido_cents, pagaEm: r.paga_em, titular: r.titular })),
    },
    { payouts: new Set((linked ?? []).flatMap((l) => (l.stripe_payout_id ? [l.stripe_payout_id] : []))), redemptions: new Set((linked ?? []).flatMap((l) => (l.redemption_id ? [l.redemption_id] : []))) },
  );
  let n = 0;
  for (const m of matches) {
    const { error } = await supabase
      .from('bank_lines')
      .update(m.tipo === 'stripe_payout' ? { classificacao: 'stripe_payout', stripe_payout_id: m.ref, automatica: true } : { classificacao: 'resgate', redemption_id: m.ref, automatica: true })
      .eq('chave', m.chave)
      .eq('classificacao', 'por_classificar');
    if (!error) n++;
  }
  return n;
}

export async function rematchAction(): Promise<FormState> {
  if (!(await admin())) return { errors: {}, message: 'Sem permissão.' };
  const n = await runAutoMatch();
  revalidatePath(PAGE, 'layout');
  return { errors: {}, ok: true, message: `${n} movimentos casados.` };
}

const UUID = /^[0-9a-f-]{36}$/i;

/** Classificação à mão de um movimento: casar com uma transferência/resgate, marcar como outro, ignorar ou desfazer. */
export async function classifyBankLineAction(lineId: string, _prev: FormState, form: FormData): Promise<FormState> {
  if (!UUID.test(lineId)) return { errors: {}, message: 'Movimento inválido.' };
  const supabase = await admin();
  if (!supabase) return { errors: {}, message: 'Sem permissão.' };
  // O botão carregado traz `decision` (outro, ignorada, desfazer); o botão «Casar» usa a opção escolhida em `casar`.
  const decision = String(form.get('decision') || form.get('casar') || '');
  const notas = String(form.get('notas') ?? '').trim().slice(0, 300) || null;
  const { data: line } = await supabase.from('bank_lines').select('id, valor_cents, classificacao').eq('id', lineId).maybeSingle();
  if (!line) return { errors: {}, message: 'Movimento não encontrado.' };
  let patch: BankPatch;
  if (decision === 'outro') {
    if (!notas) return { errors: { notas: 'Diga o que é (por exemplo, taxa bancária, renda, outro negócio).' } };
    patch = { classificacao: 'outro', notas, stripe_payout_id: null, redemption_id: null, automatica: false };
  } else if (decision === 'ignorada') patch = { classificacao: 'ignorada', notas, stripe_payout_id: null, redemption_id: null, automatica: false };
  else if (decision === 'desfazer') patch = { classificacao: 'por_classificar', notas: null, stripe_payout_id: null, redemption_id: null, automatica: false };
  else if (decision.startsWith('payout:')) {
    const id = decision.slice(7);
    const { data: p } = await supabase.from('stripe_payouts').select('id, amount_cents').eq('id', id).maybeSingle();
    if (!p) return { errors: {}, message: 'Transferência não encontrada.' };
    if (p.amount_cents !== line.valor_cents) return { errors: {}, message: 'O valor da transferência não coincide com o do movimento.' };
    patch = { classificacao: 'stripe_payout', stripe_payout_id: id, redemption_id: null, notas, automatica: false };
  } else if (decision.startsWith('resgate:')) {
    const id = decision.slice(8);
    if (!UUID.test(id)) return { errors: {}, message: 'Resgate inválido.' };
    const { data: r } = await supabase.from('referral_redemptions').select('id, liquido_cents').eq('id', id).maybeSingle();
    if (!r) return { errors: {}, message: 'Resgate não encontrado.' };
    if (-r.liquido_cents !== line.valor_cents) return { errors: {}, message: 'O valor do resgate não coincide com o do movimento.' };
    patch = { classificacao: 'resgate', redemption_id: id, stripe_payout_id: null, notas, automatica: false };
  } else return { errors: {}, message: 'Escolha o que fazer com o movimento.' };
  const { error } = await supabase.from('bank_lines').update(patch).eq('id', lineId);
  if (error) return { errors: {}, message: /unique|duplicate/i.test(error.message) ? 'Essa transferência ou esse resgate já está casado com outro movimento.' : error.message };
  revalidatePath(PAGE, 'layout');
  return { errors: {}, ok: true, message: 'Guardado.' };
}
