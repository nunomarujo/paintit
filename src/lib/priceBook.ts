import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { aprenderDe } from '@/domain/priceBook';
import type { LineCategory, Unit } from '@/domain/proposal';
import type { Database } from '@/lib/database.types';

/**
 * A biblioteca de preços aprende de um orçamento acabado (25/10/2026, docs/DECISOES.md).
 *
 * Vive aqui, e não em cada acção, porque aprende de **duas origens**: os orçamentos que a empresa faz
 * aos clientes dela e as propostas que submete aos pedidos do mercado. São linhas iguais, com a mesma
 * estrutura, e deixar o mercado de fora era desperdiçar metade dos dados que já temos.
 *
 * Aprende-se no momento em que o orçamento sai das mãos dele — submetido ou dado como enviado —,
 * porque é aí que os preços são os definitivos.
 */
export async function learnPrices(
  supabase: SupabaseClient<Database>,
  orgId: string,
  linhas: { descricao: string; unidade: Unit; precoUnitario: number; categoria: LineCategory; trabalho?: string | null }[],
): Promise<void> {
  const aprendidas = aprenderDe(linhas);
  if (aprendidas.length === 0) return;

  const { data: existentes } = await supabase
    .from('org_price_book')
    .select('chave, vezes')
    .eq('org_id', orgId)
    .in('chave', aprendidas.map((a) => a.chave));
  const vezesDe = new Map((existentes ?? []).map((e) => [e.chave, e.vezes]));
  const hoje = new Date().toISOString().slice(0, 10);

  await supabase.from('org_price_book').upsert(
    aprendidas.map((a) => ({
      org_id: orgId,
      chave: a.chave,
      descricao: a.descricao,
      categoria: a.categoria,
      unidade: a.unidade,
      preco_unitario: a.precoUnitario,
      vezes: (vezesDe.get(a.chave) ?? 0) + 1,
      ultima_vez: hoje,
    })),
    { onConflict: 'org_id,chave' },
  );
}
