import 'server-only';
import { createHash, randomInt, timingSafeEqual } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';
import { emVigor, type LinhaDeElemento } from '@/domain/elementosDoContrato';

type Client = SupabaseClient<Database>;

/** O histórico de uma contratação, mais antigo primeiro — o que a RLS deixar ver (as partes e a equipa). */
export async function historicoDosElementos(supabase: Client, engagementId: string): Promise<LinhaDeElemento[]> {
  const { data, error } = await supabase
    .from('elementos_do_contrato')
    .select('lado, campo, valor, validacao, criado_em, criado_por')
    .eq('engagement_id', engagementId)
    .order('criado_em');
  // Sem a migração aplicada, a tabela não existe: vazio, sem derrubar o ecrã.
  if (error || !data) return [];
  return data.map((r) => ({
    lado: r.lado as LinhaDeElemento['lado'],
    campo: r.campo as LinhaDeElemento['campo'],
    valor: r.valor,
    validacao: r.validacao as LinhaDeElemento['validacao'],
    criadoEm: r.criado_em,
    criadoPor: r.criado_por,
  }));
}

export async function elementosEmVigor(supabase: Client, engagementId: string) {
  return emVigor(await historicoDosElementos(supabase, engagementId));
}

/** Um código de 6 algarismos, uniforme. */
export const novoCodigo = () => String(randomInt(0, 1_000_000)).padStart(6, '0');

/** O resumo guardado: SHA-256 do código com o identificador da linha, para o mesmo código não dar o mesmo resumo. */
export const resumoDoCodigo = (codigo: string, sal: string) => createHash('sha256').update(`${sal}:${codigo}`).digest('hex');

/** Comparação em tempo constante. */
export function resumosIguais(a: string, b: string): boolean {
  const x = Buffer.from(a, 'hex');
  const y = Buffer.from(b, 'hex');
  return x.length === y.length && x.length > 0 && timingSafeEqual(x, y);
}
