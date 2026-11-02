import { formatEuros, percentOf } from '@/domain/money';
import { LINE_CATEGORIES, LINE_CATEGORY_LABELS } from '@/domain/proposal';
import { DESIRED_WORK_LABELS } from '@/domain/request';
import { ESTADO_ACCAO, ESTADO_LABELS, porEsclarecer, quantidadeEmPalavras, type EstadoNoPedido, type TrabalhoNaProposta } from '@/domain/comparador';
import { construirComparacao } from '../dados';
import { PEDIDO } from '../fixtures';

// Estado 2 — Comparação detalhada. A mesma tabela de src/app/app/pedidos/[id]/propostas/page.tsx
// ("Comparação detalhada"), com os valores que compareProposals, trabalhosDaProposta e classificar
// calcularam para os dados fictícios de fixtures.ts.
// Repetido por rota (já vem do layout.tsx): ver nota em estado-1-sintese/page.tsx.
export const dynamic = 'force-static';

export default function Page() {
  const { rows, byId, trabalhosPorProposta, pt } = construirComparacao();

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-5xl p-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
          <h2 className="font-semibold">Comparação detalhada</h2>
          <p className="mt-1 text-[15px] text-slate-500">
            A ordenação é por ordem de chegada. Valores em falta aparecem como “não indicado” e nunca como incluídos.
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[40rem] text-left text-[17px]">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="py-2 pr-3 font-normal text-slate-500" />
                  {rows.map((r) => (
                    <th key={r.id} className="py-2 pr-3 font-semibold">
                      {r.alias}
                      <span className="block text-[15px] font-normal text-slate-500">Em análise</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <Row label="Preço sem IVA" cells={rows.map((r) => <strong key={r.id}>{formatEuros(r.totals.base)}</strong>)} />
                <Row label="Total com IVA" cells={rows.map((r) => formatEuros(r.totals.totalComIva))} />
                <Row label="Preço por m²" cells={rows.map((r) => (r.precoM2 !== null ? formatEuros(r.precoM2) : '—'))} />
                {PEDIDO.map((w, i) => (
                  <Row
                    key={w}
                    label={`${DESIRED_WORK_LABELS[w]} (pedido)`}
                    cells={rows.map((r) => <Trabalho key={r.id} t={trabalhosPorProposta.get(r.id)![i]!} />)}
                  />
                ))}
                {LINE_CATEGORIES.map((c) => (
                  <Row
                    key={c}
                    label={LINE_CATEGORY_LABELS[c]}
                    cells={rows.map((r) => (r.categorias[c] !== null ? formatEuros(r.categorias[c]!) : '—'))}
                  />
                ))}
                <Row
                  label="Preços condicionados"
                  cells={rows.map((r) => (r.temCondicionados ? <span key={r.id} className="text-amber-800">Sim, ver detalhe</span> : 'Não'))}
                />
                <Row label="Opcionais" cells={rows.map((r) => (r.totals.opcionais > 0 ? formatEuros(r.totals.opcionais) : '—'))} />
                <Row label="Duração" cells={rows.map((r) => (byId.get(r.id)!.terms.duracaoDias ? `${byId.get(r.id)!.terms.duracaoDias} dias` : <Missing key={r.id} />))} />
                <Row label="Início possível" cells={rows.map((r) => pt(byId.get(r.id)!.terms.inicioPossivel))} />
                <Row
                  label="Adiantamento"
                  cells={rows.map((r) => {
                    const p = byId.get(r.id)!;
                    return p.terms.adiantamentoBps > 0 ? `${p.terms.adiantamentoBps / 100}% (${formatEuros(percentOf(r.totals.base, p.terms.adiantamentoBps))})` : 'Nenhum';
                  })}
                />
                <Row label="Garantia da obra" cells={rows.map((r) => { const g = byId.get(r.id)!.terms.garantiaAnos; return g !== null ? `${g} anos` : <Missing key={r.id} />; })} />
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}

function Row({ label, cells }: { label: string; cells: React.ReactNode[] }) {
  return (
    <tr>
      <th className="py-1.5 pr-3 font-normal text-slate-500">{label}</th>
      {cells.map((c, i) => (
        <td key={i} className="py-1.5 pr-3">{c}</td>
      ))}
    </tr>
  );
}

function Missing() {
  return <span className="text-slate-600">Não indicado</span>;
}

function Trabalho({ t }: { t: TrabalhoNaProposta }) {
  const detalhe = [quantidadeEmPalavras(t), t.demaos ? `${t.demaos} ${t.demaos === 1 ? 'demão' : 'demãos'}` : null, ...t.produtos]
    .filter(Boolean)
    .join(' · ');
  return (
    <span className="block">
      <span className={COR_DO_ESTADO[t.estado]}>{ESTADO_LABELS[t.estado]}</span>
      {t.precoCents > 0 && <span className="ml-2 tabular-nums text-slate-900">{formatEuros(t.precoCents)}</span>}
      {detalhe && <span className="block text-[15px] text-slate-600">{detalhe}</span>}
      {porEsclarecer(t.estado) && <span className="block text-[15px] text-amber-800">{ESTADO_ACCAO[t.estado]}</span>}
    </span>
  );
}

const COR_DO_ESTADO: Record<EstadoNoPedido, string> = {
  incluido: 'text-tinta-700',
  opcional: 'text-slate-900',
  condicionado: 'text-amber-800',
  excluido: 'text-red-700',
  nao_indicado: 'text-slate-600',
};
