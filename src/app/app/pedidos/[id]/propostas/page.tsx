import Link from 'next/link';
import { notFound } from 'next/navigation';
import { MessageThread } from '@/components/MessageThread';
import { ProposalView } from '@/components/ProposalView';
import { clientGuarantee } from '@/domain/commission';
import { formatEuros, percentOf } from '@/domain/money';
import { LINE_CATEGORIES, LINE_CATEGORY_LABELS, SORT_LABELS, compareProposals, sortRows, type SortKey } from '@/domain/proposal';
import { SURFACE_KIND_LABELS, formatArea } from '@/domain/request';
import { CURRENT_RULES } from '@/domain/rules';
import { canManage, myRole } from '@/lib/access';
import { toLine, toTerms } from '@/lib/proposals';
import { getUser } from '@/lib/supabase/server';
import { ChooseButton } from './ChooseButton';

const card = 'rounded-2xl border border-slate-200 bg-white p-6';
const pt = (d: string | null) => (d ? d.split('-').reverse().join('/') : 'Não indicado');
const STATUS: Record<string, string> = {
  submetida: 'Em análise',
  retirada: 'Retirada pelo pintor',
  selecionada: 'Escolhida',
  nao_selecionada: 'Não escolhida',
};

// Comparador do cliente (CLI-14, CLI-15): propostas lado a lado, sem identificar os pintores.
export default async function ProposalsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ordem?: string }>;
}) {
  const { id } = await params;
  const { ordem } = await searchParams;
  const sortKey: SortKey = ordem === 'prazo' || ordem === 'completude' ? ordem : 'preco';
  const { supabase, user } = await getUser();

  const { data: req } = await supabase.from('work_requests').select('*').eq('id', id).maybeSingle();
  if (!req) notFound();
  const [{ data: org }, { data: surfaces }, { data: proposals }, { data: messages }] = await Promise.all([
    supabase.from('organizations').select('id, nome, gerida_por').eq('id', req.org_id).single(),
    supabase.from('request_surfaces').select('kind, area_cm2').eq('request_id', id),
    supabase.from('proposals').select('*').eq('request_id', id).neq('status', 'rascunho').order('submitted_at'),
    supabase.from('proposal_messages').select('id, proposal_id, lado, texto, created_at').eq('request_id', id).order('created_at'),
  ]);
  if (!org) notFound();
  const manager = canManage(await myRole(supabase, user!.id, org));

  const list = proposals ?? [];
  const ids = list.map((p) => p.id);
  const { data: lines } = ids.length
    ? await supabase.from('proposal_lines').select('*').in('proposal_id', ids).order('created_at')
    : { data: [] };
  const linesOf = (pid: string) => (lines ?? []).filter((l) => l.proposal_id === pid).map((l) => ({ id: l.id, ...toLine(l) }));
  const areaTotal = (surfaces ?? []).reduce((n, s) => n + s.area_cm2, 0);
  const rows = compareProposals(
    list.map((p) => ({
      id: p.id,
      lines: linesOf(p.id),
      ivaBps: p.iva_bps,
      duracaoDias: p.duracao_dias,
      inicioPossivel: p.inicio_possivel,
      adiantamentoBps: p.adiantamento_bps,
    })),
    { areaTotal, superficies: (surfaces ?? []).map((s) => s.kind) },
  );
  const byId = new Map(list.map((p) => [p.id, p]));
  const active = rows.filter((r) => byId.get(r.id)!.status !== 'retirada');
  const sorted = sortRows(active, sortKey, Object.fromEntries(list.map((p) => [p.id, p.duracao_dias])));
  const chosen = list.find((p) => p.status === 'selecionada');
  const threadsWithoutProposal = [...new Set((messages ?? []).map((m) => m.proposal_id))].filter((pid) => !byId.has(pid));
  const path = `/app/pedidos/${id}/propostas`;

  return (
    <div className="space-y-8">
      <div>
        <Link href={`/app/pedidos/${id}`} className="text-sm text-slate-600 hover:underline">
          ← {req.titulo}
        </Link>
        <h1 className="mt-3 text-2xl font-semibold">Propostas recebidas</h1>
        <p className="mt-1 text-sm text-slate-600">
          Os pintores aparecem como Pintor A, B, C… pela ordem de chegada. A identidade e os contactos só são revelados
          depois da escolha, quando o pintor confirmar. Área do pedido: {formatArea(areaTotal)}.
        </p>
      </div>

      {active.length === 0 ? (
        <p className={`${card} text-sm text-slate-600`}>Ainda não há propostas submetidas.</p>
      ) : (
        <section className={card}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold">Comparação</h2>
            <form className="flex items-center gap-2 text-sm">
              <label htmlFor="ordem">Ordenar por</label>
              <select id="ordem" name="ordem" defaultValue={sortKey} className="rounded-lg border border-slate-300 bg-white px-2 py-1">
                {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => (
                  <option key={k} value={k}>
                    {SORT_LABELS[k]}
                  </option>
                ))}
              </select>
              <button type="submit" className="rounded-lg border border-slate-300 px-3 py-1 hover:bg-slate-50">
                Aplicar
              </button>
            </form>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            A ordenação é só pelo critério escolhido; não é uma recomendação. Valores em falta aparecem como “não indicado”
            e nunca como incluídos.
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[40rem] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="py-2 pr-3 font-normal text-slate-500" />
                  {sorted.map((r) => (
                    <th key={r.id} className="py-2 pr-3 font-semibold">
                      {r.alias}
                      <span className="block text-xs font-normal text-slate-500">{STATUS[byId.get(r.id)!.status]}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <Row label="Preço sem IVA" cells={sorted.map((r) => <strong key={r.id}>{formatEuros(r.totals.base)}</strong>)} />
                <Row label="Total com IVA" cells={sorted.map((r) => formatEuros(r.totals.totalComIva))} />
                <Row label="Preço por m²" cells={sorted.map((r) => (r.precoM2 !== null ? formatEuros(r.precoM2) : '—'))} />
                {LINE_CATEGORIES.map((c) => (
                  <Row
                    key={c}
                    label={LINE_CATEGORY_LABELS[c]}
                    cells={sorted.map((r) => (r.categorias[c] !== null ? formatEuros(r.categorias[c]!) : <Missing key={r.id} />))}
                  />
                ))}
                <Row
                  label="Superfícies sem preço"
                  cells={sorted.map((r) =>
                    r.superficiesEmFalta.length === 0 ? (
                      'Todas cobertas'
                    ) : (
                      <span key={r.id} className="text-amber-800">
                        {r.superficiesEmFalta.map((s) => SURFACE_KIND_LABELS[s]).join(', ')}
                      </span>
                    ),
                  )}
                />
                <Row
                  label="Preços condicionados"
                  cells={sorted.map((r) => (r.temCondicionados ? <span key={r.id} className="text-amber-800">Sim, ver detalhe</span> : 'Não'))}
                />
                <Row label="Opcionais" cells={sorted.map((r) => (r.totals.opcionais > 0 ? formatEuros(r.totals.opcionais) : '—'))} />
                <Row label="Duração" cells={sorted.map((r) => byId.get(r.id)!.duracao_dias ? `${byId.get(r.id)!.duracao_dias} dias` : <Missing key={r.id} />)} />
                <Row label="Início possível" cells={sorted.map((r) => pt(byId.get(r.id)!.inicio_possivel))} />
                <Row
                  label="Adiantamento"
                  cells={sorted.map((r) => {
                    const p = byId.get(r.id)!;
                    return p.adiantamento_bps > 0 ? `${p.adiantamento_bps / 100}% (${formatEuros(percentOf(r.totals.base, p.adiantamento_bps))})` : 'Nenhum';
                  })}
                />
                <Row label="Garantia da obra" cells={sorted.map((r) => { const g = byId.get(r.id)!.garantia_anos; return g !== null ? `${g} anos` : <Missing key={r.id} />; })} />
                <Row label="Válida até" cells={sorted.map((r) => pt(byId.get(r.id)!.validade))} />
                <Row
                  label="Documentos do pintor"
                  cells={sorted.map((r) => (byId.get(r.id)!.pintor_verificado ? 'Verificados pela plataforma' : 'Ainda por verificar'))}
                />
                <Row
                  label="Versão do pedido"
                  cells={sorted.map((r) => {
                    const v = byId.get(r.id)!.request_version;
                    return v === req.version ? 'Atual' : <span key={r.id} className="text-amber-800">Versão {v} (anterior)</span>;
                  })}
                />
                <Row label="Avaliações" cells={sorted.map((r) => <span key={r.id} className="text-slate-500">Histórico insuficiente</span>)} />
              </tbody>
            </table>
          </div>
        </section>
      )}

      {rows.map((r) => {
        const p = byId.get(r.id)!;
        const terms = toTerms(p);
        const guarantee = clientGuarantee(r.totals.base, CURRENT_RULES);
        const advance = percentOf(r.totals.base, p.adiantamento_bps);
        return (
          <section key={r.id} className={card} id={r.id}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-semibold">{r.alias}</h2>
              <span className="text-sm text-slate-600">{STATUS[p.status]}</span>
            </div>
            <div className="mt-4">
              <ProposalView lines={linesOf(p.id)} terms={terms} />
            </div>
            {manager && !chosen && p.status === 'submetida' && (
              <div className="mt-4">
                <ChooseButton
                  proposalId={p.id}
                  requestId={id}
                  summary={[
                    'O pedido deixa de receber propostas e as outras ficam como não escolhidas.',
                    `Deposita no parceiro de pagamentos a garantia de ${formatEuros(guarantee)} (3% sem IVA)${
                      advance > 0 ? ` e o adiantamento de ${formatEuros(advance)}` : ''
                    }. A garantia é-lhe devolvida quando as duas partes assinarem.`,
                    'Assina a minuta do contrato com Chave Móvel Digital.',
                    'O pintor tem 8 dias para pagar a comissão à plataforma; só então assina e as identidades são reveladas.',
                    'Num condomínio, confirme que a escolha foi aprovada em assembleia (vai precisar da ata).',
                  ]}
                />
              </div>
            )}
            <div className="mt-6 border-t border-slate-100 pt-4">
              <h3 className="text-sm font-semibold">Mensagens com {r.alias}</h3>
              <div className="mt-3">
                <MessageThread
                  proposalId={p.id}
                  side="cliente"
                  path={path}
                  messages={(messages ?? []).filter((m) => m.proposal_id === p.id)}
                  canWrite={manager && ['submetida', 'selecionada'].includes(p.status)}
                  otherLabel={r.alias}
                />
              </div>
            </div>
          </section>
        );
      })}

      {threadsWithoutProposal.map((pid, i) => (
        <section key={pid} className={card}>
          <h2 className="font-semibold">Pergunta de um pintor {threadsWithoutProposal.length > 1 ? i + 1 : ''} (proposta ainda por submeter)</h2>
          <div className="mt-3">
            <MessageThread
              proposalId={pid}
              side="cliente"
              path={path}
              messages={(messages ?? []).filter((m) => m.proposal_id === pid)}
              canWrite={manager && !chosen}
              otherLabel="Pintor"
            />
          </div>
        </section>
      ))}
    </div>
  );
}

function Row({ label, cells }: { label: string; cells: React.ReactNode[] }) {
  return (
    <tr>
      <th className="py-1.5 pr-3 font-normal text-slate-500">{label}</th>
      {cells.map((c, i) => (
        <td key={i} className="py-1.5 pr-3">
          {c}
        </td>
      ))}
    </tr>
  );
}

function Missing() {
  return <span className="text-slate-400">Não indicado</span>;
}
