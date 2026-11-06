import 'server-only';
import { cache } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { replay, type EngagementRecord, type Replay } from '@/domain/contracting';
import { toEngagementRecord } from '@/domain/engagementRecord';
import { ordenarPorUrgencia, proximoPasso, type ProximoPasso } from '@/domain/proximoPasso';
import type { Database } from '@/lib/database.types';
import { toEvent } from '@/lib/engagements';
import { createClient } from '@/lib/supabase/server';

type Client = SupabaseClient<Database>;
type EngagementRow = Database['public']['Tables']['engagements']['Row'];
type EventRow = Database['public']['Tables']['engagement_events']['Row'];

const PAGINA = 1000;

export interface ContratoAMinhaEspera {
  id: string;
  requestId: string;
  lado: 'cliente' | 'pintor';
  passo: ProximoPasso;
}

/**
 * As contratações em que o próximo passo é desta pessoa (`proximoPasso`), da mais urgente para a menos —
 * para o contador do menu, o aviso do Início e a lista. Só conta onde a pessoa pode agir: proprietário ou
 * gestor da entidade, ou da administradora que a gere (a mesma regra de `myRole`/`canManage`).
 *
 * Corre no layout, em todas as páginas: por isso não reconstrói cada contratação com `loadReplay` (duas a
 * três consultas por contratação), mas com três consultas ao todo — entidades, contratações e
 * acontecimentos — e o resto em memória. As contratações de onde outras transitaram vêm na mesma leva.
 */
export async function contratosAMinhaEspera(supabase: Client, userId: string, now = new Date()): Promise<ContratoAMinhaEspera[]> {
  const { data: membros } = await supabase
    .from('org_members')
    .select('org_id')
    .eq('user_id', userId)
    .in('role', ['proprietario', 'gestor']);
  const geridas = (membros ?? []).map((m) => m.org_id);
  if (geridas.length === 0) return [];
  const { data: filhas } = await supabase.from('organizations').select('id').in('gerida_por', geridas);
  const minhas = new Set([...geridas, ...(filhas ?? []).map((o) => o.id)]);
  const lista = [...minhas].join(',');
  const { data: rows } = await supabase.from('engagements').select('*').or(`client_org_id.in.(${lista}),painter_org_id.in.(${lista})`);
  if (!rows?.length) return [];

  // As contratações de origem de um valor transitado (normalmente já estão na leva; senão, vão-se buscar).
  const porId = new Map<string, EngagementRow>(rows.map((r) => [r.id, r]));
  for (let volta = 0; volta < 5; volta++) {
    const faltam = [...porId.values()].map((r) => r.carried_from).filter((x): x is string => !!x && !porId.has(x));
    if (faltam.length === 0) break;
    const { data: mais } = await supabase.from('engagements').select('*').in('id', faltam);
    if (!mais?.length) break;
    for (const r of mais) porId.set(r.id, r);
  }
  // Por páginas: o servidor da API corta cada resposta às 1000 linhas, e uma lista cortada reconstruía
  // contratações num estado antigo — o contador dizia «assinar» a um contrato já assinado (revisão de
  // 06/11/2026). Os identificadores vão em grupos, para o endereço do pedido não crescer sem fim.
  const eventos: EventRow[] = [];
  const ids = [...porId.keys()];
  for (let g = 0; g < ids.length; g += 100) {
    const grupo = ids.slice(g, g + 100);
    for (let desde = 0; ; desde += PAGINA) {
      const { data, error } = await supabase
        .from('engagement_events')
        .select('*')
        .in('engagement_id', grupo)
        .order('at')
        .order('id')
        .range(desde, desde + PAGINA - 1);
      // Uma página que falha não pode dar uma contagem errada: sem os acontecimentos todos, não se conta.
      if (error) throw error;
      eventos.push(...(data ?? []));
      if ((data ?? []).length < PAGINA) break;
    }
  }
  const doContrato = new Map<string, EventRow[]>();
  for (const v of eventos) doContrato.set(v.engagement_id, [...(doContrato.get(v.engagement_id) ?? []), v]);

  const feitas = new Map<string, Replay>();
  const reconstruir = (r: EngagementRow, fundo = 0): Replay => {
    const ja = feitas.get(r.id);
    if (ja) return ja;
    const origem = r.carried_from ? porId.get(r.carried_from) : undefined;
    const carried: EngagementRecord['carried'] = origem && fundo < 5 ? reconstruir(origem, fundo + 1).carriedOut : undefined;
    const feita = replay(toEngagementRecord(r, carried), (doContrato.get(r.id) ?? []).map(toEvent), now);
    feitas.set(r.id, feita);
    return feita;
  };

  const out: ContratoAMinhaEspera[] = [];
  for (const r of rows) {
    // Uma contratação malformada não pode apagar o aviso das outras (nem a página: isto corre no layout).
    try {
      const lado = minhas.has(r.client_org_id) ? 'cliente' : 'pintor';
      const passo = proximoPasso(reconstruir(r).engagement, lado);
      if (passo) out.push({ id: r.id, requestId: r.request_id, lado, passo });
    } catch {
      continue;
    }
  }
  return ordenarPorUrgencia(out);
}

/**
 * O mesmo, uma vez por pedido ao servidor: o layout (contador do menu) e a página (aviso do Início, lista)
 * pedem-no os dois, e `cache` do React dá-lhes a mesma resposta. Uma falha dá lista vazia — isto corre em
 * todas as páginas, e um aviso a menos é melhor do que uma página em branco.
 */
export const aMinhaEspera = cache(async (userId: string): Promise<ContratoAMinhaEspera[]> => {
  try {
    return await contratosAMinhaEspera(await createClient(), userId);
  } catch {
    return [];
  }
});
