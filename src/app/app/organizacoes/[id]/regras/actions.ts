'use server';

import { revalidatePath } from 'next/cache';
import type { FormState } from '@/app/app/actions';
import { PRODUCT_TYPES, parsePercent, type ProductType } from '@/domain/catalog';
import { getUser } from '@/lib/supabase/server';

const NAO_ENTROU: FormState = { errors: {}, message: 'A sessão expirou.' };

/**
 * Grava um limite de desconto. Três formas, e só três: da empresa, de um vendedor, ou de uma categoria
 * ou produto (`src/domain/limitesDeDesconto.ts`).
 *
 * O alvo chega do navegador e por isso valida-se aqui — e a base recusa na mesma quem não manda na
 * empresa (regra 10 do CLAUDE.md).
 */
export async function guardarLimite(orgId: string, _prev: FormState, form: FormData): Promise<FormState> {
  const { supabase, user } = await getUser();
  if (!user) return NAO_ENTROU;

  const bps = parsePercent(form.get('limite'));
  if (bps === null || Number.isNaN(bps) || bps < 0 || bps > 10000) {
    return { errors: { limite: 'Percentagem entre 0 e 100.' } };
  }

  const alvo = String(form.get('alvo') ?? '').trim();
  let linha: { vendedor_user_id?: string | null; tipo?: ProductType | null; product_id?: string | null };
  if (alvo === 'empresa') {
    linha = {};
  } else if (alvo.startsWith('vendedor:')) {
    const u = alvo.slice('vendedor:'.length);
    if (!/^[0-9a-f-]{36}$/i.test(u)) return { errors: { alvo: 'Vendedor inválido.' } };
    // Só um vendedor desta empresa: sem isto, um identificador trocado no navegador escrevia um limite
    // em nome de alguém de fora.
    const { data: membro } = await supabase
      .from('org_members')
      .select('user_id')
      .eq('org_id', orgId)
      .eq('user_id', u)
      .maybeSingle();
    if (!membro) return { errors: { alvo: 'Essa pessoa não pertence a esta empresa.' } };
    linha = { vendedor_user_id: u };
  } else if (alvo.startsWith('tipo:')) {
    const t = alvo.slice('tipo:'.length);
    if (!(PRODUCT_TYPES as readonly string[]).includes(t)) return { errors: { alvo: 'Categoria inválida.' } };
    linha = { tipo: t as ProductType };
  } else if (alvo.startsWith('produto:')) {
    const p = alvo.slice('produto:'.length);
    if (!/^[0-9a-f-]{36}$/i.test(p)) return { errors: { alvo: 'Produto inválido.' } };
    const { data: produto } = await supabase.from('products').select('id').eq('id', p).eq('org_id', orgId).maybeSingle();
    if (!produto) return { errors: { alvo: 'Esse produto não é desta empresa.' } };
    linha = { product_id: p };
  } else {
    return { errors: { alvo: 'Escolha a quem se aplica.' } };
  }

  const { error } = await supabase
    .from('supplier_discount_limits')
    .upsert({ org_id: orgId, ...linha, limite_bps: bps }, { onConflict: 'org_id, vendedor_user_id, tipo, product_id' });
  if (error) return { errors: {}, message: 'Não foi possível guardar o limite.' };

  revalidatePath(`/app/organizacoes/${orgId}/regras`);
  return { errors: {}, ok: true, message: 'Limite guardado.' };
}

export async function apagarLimite(orgId: string, limiteId: string): Promise<void> {
  const { supabase, user } = await getUser();
  if (!user) return;
  await supabase.from('supplier_discount_limits').delete().eq('id', limiteId).eq('org_id', orgId);
  revalidatePath(`/app/organizacoes/${orgId}/regras`);
}
