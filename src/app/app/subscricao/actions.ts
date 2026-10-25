'use server';

import { revalidatePath } from 'next/cache';
import type { FormState } from '@/app/app/actions';
import { PERIODICIDADES, PRECO_ATUAL, type Periodicidade } from '@/domain/painterPlan';
import { painterOrgs } from '@/lib/queries';
import { getUser } from '@/lib/supabase/server';

const isPeriodicidade = (v: unknown): v is Periodicidade => typeof v === 'string' && (PERIODICIDADES as readonly string[]).includes(v);

/**
 * Adesão ao plano Pro. Fica em 'por_pagar': quem a activa é o parceiro de pagamentos, nunca este
 * formulário — a política de RLS recusa um insert já activo, e o argumento que vem do navegador não
 * decide nada (CLAUDE.md, regras 4 e 10). O preço é lido da tabela em vigor no servidor, não do
 * formulário, para que ninguém subscreva ao preço que escrever no HTML.
 */
export async function subscribePro(_prev: FormState, form: FormData): Promise<FormState> {
  const periodicidade = form.get('periodicidade');
  if (!isPeriodicidade(periodicidade)) return { errors: { periodicidade: 'Escolha mensal ou anual.' } };

  const { supabase, user } = await getUser();
  const orgs = await painterOrgs(supabase, user!.id);
  const org = orgs[0];
  if (!org) return { errors: {}, message: 'Só uma empresa de pintura pode subscrever.' };

  const { error } = await supabase.from('org_subscriptions').insert({
    org_id: org.id,
    plano: 'pro',
    periodicidade,
    estado: 'por_pagar',
    preco_versao: PRECO_ATUAL.version,
    preco_cents: periodicidade === 'anual' ? PRECO_ATUAL.anualCents : PRECO_ATUAL.mensalCents,
  });
  if (error) {
    return { errors: {}, message: error.code === '23505' ? 'Já tem uma subscrição a decorrer.' : 'Não foi possível registar a adesão.' };
  }
  revalidatePath('/app/subscricao');
  return { errors: {}, ok: true, message: 'Adesão registada. Falta o pagamento para o plano ficar activo.' };
}

/** Cancelar: a subscrição mantém-se — e o desconto com ela — até ao fim do período já pago. */
export async function cancelPro(_prev: FormState, _form: FormData): Promise<FormState> {
  const { supabase, user } = await getUser();
  const orgs = await painterOrgs(supabase, user!.id);
  const org = orgs[0];
  if (!org) return { errors: {}, message: 'Sem empresa de pintura.' };

  const { error } = await supabase
    .from('org_subscriptions')
    .update({ estado: 'cancelada', cancelada_em: new Date().toISOString() })
    .eq('org_id', org.id)
    .in('estado', ['ativa', 'por_pagar']);
  if (error) return { errors: {}, message: 'Não foi possível cancelar.' };
  revalidatePath('/app/subscricao');
  return { errors: {}, ok: true, message: 'Subscrição cancelada.' };
}
