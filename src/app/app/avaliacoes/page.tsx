import { notFound } from 'next/navigation';
import { HojeAvaliacoes } from '@/components/avaliacoes/HojeAvaliacoes';
import { getUser } from '@/lib/supabase/server';
import { osMeusLevantamentos } from './dados';

/**
 * Hoje — Avaliações. O início do contexto: o que há para fazer, com o prazo que conta.
 *
 * Substitui o painel que mostrava avisos e mais nada. Tudo o que aqui aparece é da **pessoa**, não da
 * empresa: o responsável não vê os levantamentos nem as comissões pessoais dos vendedores.
 */
export default async function HojeAvaliacoesPage({
  searchParams,
}: {
  searchParams: Promise<{ ver?: string }>;
}) {
  const { ver } = await searchParams;
  const { supabase, user } = await getUser();

  const { data: memberships } = await supabase
    .from('org_members')
    .select('org_id, role, organizations!inner(id, kind)')
    .eq('user_id', user!.id)
    .eq('organizations.kind', 'fornecedor');
  const meu = (memberships ?? []).find((m) => ['proprietario', 'gestor', 'vendedor'].includes(m.role));
  if (!meu) notFound();

  const [{ emCurso, concluidos }, { data: abertos }, { data: payouts }] = await Promise.all([
    osMeusLevantamentos(supabase, user!.id),
    supabase.from('request_surveys').select('id').eq('status', 'aberto'),
    supabase.from('survey_payouts').select('amount_cents, estado, redemption_id').eq('supplier_org_id', meu.org_id),
  ]);

  // Oportunidades: só contam as que a pré-visualização deixa ver, que são as da zona coberta (regra 6).
  const naMinhaZona = (
    await Promise.all(
      (abertos ?? []).map(async (s) => (await supabase.rpc('survey_preview', { p_survey_id: s.id })).data?.[0] ?? null),
    )
  ).filter(Boolean).length;

  const comissoes = (payouts ?? [])
    .filter((p) => p.estado === 'adjudicada' && !p.redemption_id)
    .reduce((n, p) => n + p.amount_cents, 0);

  const agora = new Date();
  // A suspensão de presença («férias») vive em «Disponibilidade e alertas», ainda por construir: quando
  // essa tabela existir, é aqui que a banda do topo passa a dizê-lo.
  const suspenso = null;

  return (
    <HojeAvaliacoes
      estado={{ emCurso, concluidos, oportunidades: naMinhaZona, comissoesDisponiveis: comissoes, suspenso }}
      agoraIso={agora.toISOString()}
      aba={ver === 'concluidos' ? 'concluidos' : 'em_curso'}
    />
  );
}
