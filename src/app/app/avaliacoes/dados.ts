import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';
import { obrigacaoEmCurso } from '@/domain/levantamentoNaLista';
import { referenciaDoLevantamento } from '@/domain/referencias';
import type { LevantamentoNaLista } from '@/components/avaliacoes/LinhaDeLevantamento';

/**
 * Os levantamentos **da pessoa** que está a usar a aplicação — não os da empresa.
 *
 * A privacidade entre pessoa e empresa é uma regra do promotor (01/11/2026): o responsável não vê os
 * levantamentos nem as comissões pessoais dos vendedores. Por isso o filtro é `vendedor_user_id`, nunca
 * `vendedor_org_id`, e isto vive aqui para não ser reescrito de outra maneira no ecrã do lado.
 */
export async function osMeusLevantamentos(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<{ emCurso: LevantamentoNaLista[]; concluidos: LevantamentoNaLista[] }> {
  const { data: tentativas } = await supabase
    .from('survey_attempts')
    .select(
      'survey_id, estado, prazo_contacto, prazo_conclusao, adiado_para, contacto_registado_em, agendado_para, resposta_cliente',
    )
    .eq('vendedor_user_id', userId)
    .in('estado', ['ativa', 'em_revisao', 'concluida'])
    .order('aceita_em', { ascending: false });

  const ids = (tentativas ?? []).map((t) => t.survey_id);
  if (ids.length === 0) return { emCurso: [], concluidos: [] };

  const { data: levantamentos } = await supabase.from('request_surveys').select('id, numero').in('id', ids);
  const numeroDe = new Map((levantamentos ?? []).map((s) => [s.id, s.numero]));

  // A pré-visualização é a única forma de ler concelho e tipo de obra sem furar o anonimato: devolve
  // apenas esses dois campos, e só a quem tem o levantamento (regra 6).
  const zonas = new Map(
    await Promise.all(
      ids.map(async (id) => {
        const { data } = await supabase.rpc('survey_preview', { p_survey_id: id });
        return [id, data?.[0] ?? null] as const;
      }),
    ),
  );

  const linhas: LevantamentoNaLista[] = (tentativas ?? []).map((t) => {
    const o = obrigacaoEmCurso(t);
    const z = zonas.get(t.survey_id);
    const numero = numeroDe.get(t.survey_id);
    return {
      id: t.survey_id,
      ref: numero ? referenciaDoLevantamento(numero) : '—',
      concelho: z?.concelho ?? 'Zona reservada',
      tipoObra: z?.tipo_obra ?? '',
      estado: o.estado,
      prazo: o.prazo,
      prazoUtil: o.prazoUtil,
      agendadoPara: o.agendadoPara,
    };
  });

  // Por urgência: quem tem prazo a correr primeiro, e o mais apertado à cabeça.
  const emCurso = linhas
    .filter((l) => l.estado !== 'concluido')
    .sort((a, b) => (a.prazo ? new Date(a.prazo).getTime() : Infinity) - (b.prazo ? new Date(b.prazo).getTime() : Infinity));
  const concluidos = linhas.filter((l) => l.estado === 'concluido');
  return { emCurso, concluidos };
}
