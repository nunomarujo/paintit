import { SemEmpresa } from '@/components/vendas/SemEmpresa';
import { pertencaDoFornecedor } from '@/lib/fornecedor';
import { HojeAvaliacoes } from '@/components/avaliacoes/HojeAvaliacoes';
import { getUser } from '@/lib/supabase/server';
import { suspensaoEmCurso } from '@/domain/disponibilidade';
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

  const pertenca = await pertencaDoFornecedor(supabase, user!);
  // «Ainda não pertenço a nenhuma empresa» e «fui convidado e não aceitei» não são erros: são
  // estados por resolver, cada um com a sua ação. Antes, isto era um 404 (01/11/2026).
  if (pertenca.tipo === 'sem_empresa') return <SemEmpresa convites={pertenca.convites} />;

  const [{ emCurso, concluidos }, { data: abertos }, { data: payouts }, { data: presenca }, { data: cobertura }] = await Promise.all([
    osMeusLevantamentos(supabase, user!.id),
    supabase.from('request_surveys').select('id').eq('status', 'aberto'),
    // As comissões são da pessoa (05/11/2026): só as suas, nunca as da empresa.
    supabase.from('survey_payouts').select('amount_cents, estado, redemption_id').eq('vendedor_user_id', user!.id),
    // A linha é da pessoa: só ela a lê (RLS), por isso não é preciso filtrar mais.
    supabase.from('survey_availability').select('suspenso_ate').eq('user_id', user!.id).maybeSingle(),
    supabase.from('supplier_survey_coverage').select('concelhos').eq('org_id', pertenca.orgId).maybeSingle(),
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
  // A suspensão de presença («férias») que a pessoa marcou em «Disponibilidade e alertas»: se está em
  // curso, é ela que ocupa a banda do topo.
  const suspenso = suspensaoEmCurso(agora, presenca?.suspenso_ate);

  return (
    <HojeAvaliacoes
      estado={{ emCurso, concluidos, oportunidades: naMinhaZona, comissoesDisponiveis: comissoes, suspenso, concelhosCobertos: cobertura?.concelhos?.length ?? 0 }}
      agoraIso={agora.toISOString()}
      aba={ver === 'concluidos' ? 'concluidos' : 'em_curso'}
    />
  );
}
