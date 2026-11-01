import { notFound } from 'next/navigation';
import { ProposalView } from '@/components/ProposalView';
import { Voltar } from '@/components/Voltar';
import { CURRENT_RULES } from '@/domain/rules';
import { localDate } from '@/domain/deadline';
import { estadoDaEntrega } from '@/domain/entrega';
import { formatEuros } from '@/domain/money';
import { compareProposals } from '@/domain/proposal';
import { SURFACE_KIND_LABELS, formatArea } from '@/domain/request';
import { parseCapoto } from '@/lib/capoto';
import { residenciasDe } from '@/lib/condomino';
import { productsFor } from '@/lib/materials';
import { toLine, toTerms } from '@/lib/proposals';
import { getUser } from '@/lib/supabase/server';
import { Voto } from './Voto';

const card = 'rounded-2xl border border-slate-200 bg-white p-4 sm:p-5';
const dataLonga = (iso: string | null) =>
  iso ? new Date(`${iso}T12:00:00`).toLocaleDateString('pt-PT', { day: 'numeric', month: 'long' }) : '—';

/**
 * As propostas de um pedido, lidas pelo condómino (01/11/2026). O mesmo documento que o cliente lê
 * (`ProposalView`: linhas, totais, condições; nunca quem a fez antes da apresentação), o resumo da
 * comparação, e o voto. Antes da abertura simultânea a base não devolve proposta nenhuma — a página
 * só diz a data. O que a plataforma cobra ao pintor não aparece aqui, como em lado nenhum do cliente.
 */
export default async function PropostasDoCondominoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await getUser();
  const residencias = await residenciasDe(supabase);
  const { data: req } = await supabase
    .from('work_requests')
    .select('id, ref, titulo, status, prazo_propostas, building_id, version')
    .eq('id', id)
    .maybeSingle();
  const residencia = req ? residencias.find((r) => r.buildingId === req.building_id) : undefined;
  if (!req || !residencia) notFound();

  const entrega = estadoDaEntrega(req.prazo_propostas, localDate(new Date(), CURRENT_RULES.timeZone), req.status === 'publicado');

  const [{ data: surfaces }, { data: proposals }, { data: votos }] = await Promise.all([
    supabase.from('request_surfaces').select('id, kind, descricao, area_cm2').eq('request_id', id).order('created_at'),
    supabase.from('proposals').select('*').eq('request_id', id).neq('status', 'rascunho').order('submitted_at'),
    supabase.from('proposal_votes').select('resident_id, proposal_id').eq('request_id', id),
  ]);
  const list = proposals ?? [];
  const ids = list.map((p) => p.id);
  const { data: lines } = ids.length ? await supabase.from('proposal_lines').select('*').in('proposal_id', ids).order('created_at') : { data: [] };
  const committed = [...new Set((lines ?? []).map((l) => l.product_id).filter((x): x is string => !!x))];
  const materialProducts = Object.fromEntries(await productsFor(supabase, committed));
  const linesOf = (pid: string) => (lines ?? []).filter((l) => l.proposal_id === pid).map((l) => ({ id: l.id, ...toLine(l) }));
  const areaTotal = (surfaces ?? []).reduce((n, s) => n + s.area_cm2, 0);
  const rows = compareProposals(
    list.map((p) => ({ id: p.id, lines: linesOf(p.id), ivaBps: p.iva_bps, duracaoDias: p.duracao_dias, inicioPossivel: p.inicio_possivel, adiantamentoBps: p.adiantamento_bps })),
    { areaTotal, superficies: (surfaces ?? []).map((s) => s.kind), zonas: (surfaces ?? []).map((s) => ({ id: s.id, kind: s.kind })) },
  );
  const zoneNames = Object.fromEntries((surfaces ?? []).map((s) => [s.id, `${s.descricao?.trim() || SURFACE_KIND_LABELS[s.kind]} (${formatArea(s.area_cm2)})`]));
  const byId = new Map(list.map((p) => [p.id, p]));

  const meuVoto = (votos ?? []).find((v) => v.resident_id === residencia.id)?.proposal_id ?? null;
  const escolhida = list.some((p) => p.status === 'selecionada');
  const votacaoAberta = entrega.entregues && req.status === 'publicado' && !escolhida;
  // O condómino vê só o seu voto; a contagem é da administração, que a leva à assembleia.

  return (
    <div className="space-y-6">
      <Voltar href="/app/condominio">{residencia.predio}</Voltar>
      <div>
        <p className="text-[13px] text-slate-500">
          Ref. {req.ref} · {residencia.condominio}
        </p>
        <h1 className="mt-1 text-[26px] leading-tight font-semibold">{req.titulo}</h1>
      </div>

      {!entrega.entregues ? (
        <section className="rounded-2xl bg-tinta-900 p-6 text-white">
          <p className="text-[13px] font-semibold text-lima">Abertura simultânea</p>
          <h2 className="mt-1 text-[20px] font-semibold">As propostas abrem a {dataLonga(entrega.abremEm)}</h2>
          <p className="mt-2 text-[15px] text-tinta-200">
            Os pintores entregam até {dataLonga(req.prazo_propostas)}, 23h59. No dia seguinte abrem todas de uma vez — para a
            administração e para os condóminos ao mesmo tempo. Até lá ninguém vê um preço, e por isso ninguém o pode usar.
          </p>
        </section>
      ) : list.length === 0 ? (
        <section className={card}>
          <p className="text-[17px]">Nenhum pintor entregou proposta dentro do prazo.</p>
          <p className="mt-1 text-[15px] text-slate-600">A administração pode prolongar o prazo ou voltar a publicar o pedido.</p>
        </section>
      ) : (
        <>
          <section className="rounded-2xl bg-paper p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-[20px] font-semibold">
                {list.length} {list.length === 1 ? 'proposta' : 'propostas'}
              </h2>
              <p className="text-[15px] text-slate-600">
                {escolhida
                  ? 'A administração já escolheu; a votação fechou.'
                  : votacaoAberta
                    ? meuVoto
                      ? 'Já votou. Pode mudar o voto enquanto a votação estiver aberta.'
                      : 'Leia as propostas e vote na que prefere. É um voto indicativo, para a assembleia.'
                    : 'A votação está fechada.'}
              </p>
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-[15px]">
                <thead>
                  <tr className="text-left text-[13px] text-slate-500">
                    <th className="py-1 pr-4 font-semibold">Proposta</th>
                    <th className="py-1 pr-4 font-semibold">Preço sem IVA</th>
                    <th className="py-1 pr-4 font-semibold">Com IVA</th>
                    <th className="py-1 pr-4 font-semibold">Duração</th>
                    <th className="py-1 pr-4 font-semibold">Cobre tudo</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const p = byId.get(r.id)!;
                    const incompleta = r.zonasEmFalta.length > 0 || r.superficiesEmFalta.length > 0;
                    return (
                      <tr key={r.id} className={`border-t border-slate-200 ${meuVoto === r.id ? 'font-semibold' : ''}`}>
                        <td className="py-2 pr-4">
                          <a href={`#${r.id}`} className="text-tinta-600 hover:underline">
                            {r.alias}
                          </a>
                          {meuVoto === r.id && <span className="ml-2 text-[13px] text-tinta-900">o meu voto</span>}
                        </td>
                        <td className="py-2 pr-4">{formatEuros(r.totals.base)}</td>
                        <td className="py-2 pr-4">{formatEuros(r.totals.totalComIva)}</td>
                        <td className="py-2 pr-4">{p.duracao_dias ? `${p.duracao_dias} dias` : '—'}</td>
                        <td className="py-2 pr-4">{incompleta ? <span className="text-amber-800">Faltam zonas</span> : 'Sim'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-[13px] text-slate-500">
              Os pintores aparecem por letra até a administração escolher: compara-se o trabalho, não o nome.
            </p>
          </section>

          {rows.map((r) => {
            const p = byId.get(r.id)!;
            return (
              <section key={r.id} id={r.id} className={card}>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="font-semibold">{r.alias}</h2>
                  {p.status === 'selecionada' && <span className="text-[15px] font-semibold text-tinta-900">Escolhida pela administração</span>}
                </div>
                <div className="mt-4">
                  <ProposalView lines={linesOf(p.id)} terms={toTerms(p)} zoneNames={zoneNames} products={materialProducts} capoto={parseCapoto((p as { capoto?: unknown }).capoto)} />
                </div>
                {p.status === 'submetida' && (
                  <div className="mt-4 border-t border-slate-200 pt-4">
                    <Voto requestId={req.id} proposalId={p.id} alias={r.alias} meuVoto={meuVoto} aberto={votacaoAberta} />
                  </div>
                )}
              </section>
            );
          })}
        </>
      )}
    </div>
  );
}
