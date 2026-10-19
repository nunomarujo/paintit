import { formatEuros } from '@/domain/money';
import {
  INCLUSION_LABELS,
  LINE_CATEGORY_LABELS,
  UNIT_LABELS,
  lineTotal,
  proposalTotals,
  type ProposalLine,
  type ProposalTerms,
} from '@/domain/proposal';
import { SURFACE_KIND_LABELS } from '@/domain/request';

const pt = (d: string | null) => (d ? d.split('-').reverse().join('/') : 'Não indicado');
const qty = (n: number) => (n / 100).toLocaleString('pt-PT', { maximumFractionDigits: 2 });

/** Proposta tal como o cliente a lê: linhas, totais e condições. Não mostra quem a fez. */
export function ProposalView({
  lines,
  terms,
  onDelete,
}: {
  lines: (ProposalLine & { id: string })[];
  terms: ProposalTerms;
  /** Se presente, cada linha tem um botão para a remover (rascunho do pintor). */
  onDelete?: (lineId: string) => React.ReactNode;
}) {
  const t = proposalTotals(lines, terms.ivaBps);
  return (
    <div className="space-y-4 text-sm">
      {lines.length === 0 ? (
        <p className="text-slate-600">Ainda sem linhas.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[36rem] text-left">
            <thead className="text-slate-500">
              <tr>
                <th className="py-1 font-normal">Trabalho</th>
                <th className="py-1 text-right font-normal">Quantidade</th>
                <th className="py-1 text-right font-normal">Preço unit.</th>
                <th className="py-1 text-right font-normal">Total</th>
                {onDelete && <th />}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {lines.map((l) => (
                <tr key={l.id} className={l.inclusao === 'incluido' ? '' : 'text-slate-500'}>
                  <td className="py-1.5 pr-2">
                    <span className="font-medium">{l.descricao}</span>
                    {l.productId && (
                      <span className="ml-2 rounded-full bg-tinta-100 px-2 py-0.5 text-xs font-semibold text-tinta-900">Material comprometido</span>
                    )}
                    <span className="block text-xs text-slate-500">
                      {LINE_CATEGORY_LABELS[l.categoria]}
                      {l.superficie ? ` · ${SURFACE_KIND_LABELS[l.superficie]}` : ''}
                      {l.demaos ? ` · ${l.demaos} demão${l.demaos > 1 ? 's' : ''}` : ''}
                      {l.produto ? ` · ${l.produto}` : ''}
                      {l.inclusao !== 'incluido' ? ` · ${INCLUSION_LABELS[l.inclusao]}` : ''}
                    </span>
                  </td>
                  <td className="py-1.5 text-right">
                    {qty(l.quantidade)} {UNIT_LABELS[l.unidade]}
                  </td>
                  <td className="py-1.5 text-right">{formatEuros(l.precoUnitario)}</td>
                  <td className="py-1.5 text-right">{formatEuros(lineTotal(l))}</td>
                  {onDelete && <td className="py-1.5 pl-2 text-right">{onDelete(l.id)}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <dl className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
        <dt className="text-slate-500">Preço sem IVA (incluído)</dt>
        <dd className="text-base font-semibold sm:text-right">{formatEuros(t.base)}</dd>
        <dt className="text-slate-500">IVA ({terms.ivaBps / 100}%)</dt>
        <dd className="sm:text-right">{formatEuros(t.iva)}</dd>
        <dt className="text-slate-500">Total com IVA</dt>
        <dd className="font-semibold sm:text-right">{formatEuros(t.totalComIva)}</dd>
        {t.opcionais > 0 && (
          <>
            <dt className="text-slate-500">Opcionais (não somados)</dt>
            <dd className="sm:text-right">{formatEuros(t.opcionais)}</dd>
          </>
        )}
        {t.condicionados > 0 && (
          <>
            <dt className="text-slate-500">Só depois de observar (indicativo)</dt>
            <dd className="sm:text-right">{formatEuros(t.condicionados)}</dd>
          </>
        )}
      </dl>

      <dl className="grid gap-x-6 gap-y-1 border-t border-slate-100 pt-3 sm:grid-cols-2">
        <dt className="text-slate-500">Válida até</dt>
        <dd className="sm:text-right">{pt(terms.validade)}</dd>
        <dt className="text-slate-500">Início possível</dt>
        <dd className="sm:text-right">{pt(terms.inicioPossivel)}</dd>
        <dt className="text-slate-500">Duração estimada</dt>
        <dd className="sm:text-right">{terms.duracaoDias ? `${terms.duracaoDias} dias` : 'Não indicada'}</dd>
        <dt className="text-slate-500">Adiantamento de adjudicação</dt>
        <dd className="sm:text-right">{terms.adiantamentoBps > 0 ? `${terms.adiantamentoBps / 100}%` : 'Nenhum'}</dd>
        <dt className="text-slate-500">Preço por m² para correções de área</dt>
        <dd className="sm:text-right">{terms.precoAjusteM2 !== null ? formatEuros(terms.precoAjusteM2) : 'Não indicado'}</dd>
        <dt className="text-slate-500">Garantia da obra</dt>
        <dd className="sm:text-right">{terms.garantiaAnos !== null ? `${terms.garantiaAnos} anos` : 'Não indicada'}</dd>
      </dl>
      {terms.exclusoes && (
        <p>
          <span className="text-slate-500">Exclusões: </span>
          <span className="whitespace-pre-line">{terms.exclusoes}</span>
        </p>
      )}
      {terms.notas && (
        <p>
          <span className="text-slate-500">Notas: </span>
          <span className="whitespace-pre-line">{terms.notas}</span>
        </p>
      )}
    </div>
  );
}
