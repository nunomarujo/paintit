import { CapotoMateriais } from '@/components/CapotoMateriais';
import type { CapotoSpec } from '@/domain/etics';
import { materialCheck, type Consumption } from '@/domain/catalog';
import { EQUIVALENT_PROPOSAL_NOTE, hasEquivalent } from '@/domain/equivalence';
import { formatEuros, percentOf } from '@/domain/money';
import {
  INCLUSION_LABELS,
  LINE_CATEGORIES,
  LINE_CATEGORY_LABELS,
  UNIT_LABELS,
  lineTotal,
  proposalTotals,
  type ProposalLine,
  type ProposalTerms,
} from '@/domain/proposal';
import { SURFACE_KIND_LABELS } from '@/domain/request';
import type { MaterialCheckProduct } from '@/lib/materials';

const pt = (d: string | null) => (d ? d.split('-').reverse().join('/') : 'Não indicado');
const qty = (n: number) => (n / 100).toLocaleString('pt-PT', { maximumFractionDigits: 2 });
const litres = (c: Consumption) => `≈ ${(c.ml / 1000).toLocaleString('pt-PT', { maximumFractionDigits: 1 })} L${c.embalagens !== null ? ` (${c.embalagens} embalagem${c.embalagens > 1 ? 'ns' : ''}${c.custo !== null ? `, ${formatEuros(c.custo)} ao preço de referência` : ''})` : ''}`;

/** Proposta tal como o cliente a lê: linhas, totais e condições. Não mostra quem a fez. */
export function ProposalView({
  lines,
  terms,
  onDelete,
  zoneNames = {},
  products = {},
  capoto = null,
}: {
  lines: (ProposalLine & { id: string })[];
  terms: ProposalTerms;
  /** Se presente, cada linha tem um botão para a remover (rascunho do pintor). */
  onDelete?: (lineId: string) => React.ReactNode;
  /** Nome de cada zona do pedido, para mostrar a que zonas se aplica cada linha. */
  zoneNames?: Record<string, string>;
  /** Capoto desta proposta, quando a obra leva um. Gera a página de materiais no fim do documento. */
  capoto?: CapotoSpec | null;
  /** Dados dos produtos comprometidos (por productId), para a conta de litros/custo esperada (materialCheck,
   * src/domain/catalog.ts) — transparência para o cliente, nunca um bloqueio ao pintor. */
  products?: Record<string, MaterialCheckProduct>;
}) {
  const t = proposalTotals(lines, terms.ivaBps);
  const global = terms.modoPreco === 'global';
  const byCategory = LINE_CATEGORIES.map((c) => [c, lines.filter((l) => l.categoria === c && l.inclusao === 'incluido').reduce((n, l) => n + lineTotal(l), 0)] as const).filter(
    ([, total]) => total > 0,
  );
  const table = (
    <>
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
                    {hasEquivalent(l.descricao) && <span className="ml-2 text-[15px] font-semibold text-amber-800">Produto ou equivalente</span>}
                    {l.productId && (
                      <span className="ml-2 rounded-full bg-tinta-100 px-2 py-0.5 text-[15px] font-semibold text-tinta-900">Material comprometido</span>
                    )}
                    {l.productId && products[l.productId] && (() => {
                      const check = materialCheck(l.quantidade, l.demaos, products[l.productId]!);
                      return check.demaosAcimaDoEsperado ? (
                        <span className="ml-2 text-[15px] font-semibold text-amber-800">
                          Mais demãos do que o produto recomenda
                        </span>
                      ) : null;
                    })()}
                    <span className="block text-[15px] text-slate-500">
                      {LINE_CATEGORY_LABELS[l.categoria]}
                      {l.zonas && l.zonas.length > 0
                        ? ` · ${l.zonas.map((z) => zoneNames[z] ?? 'Zona').join(', ')}`
                        : l.superficie
                          ? ` · ${SURFACE_KIND_LABELS[l.superficie]}`
                          : ' · Obra toda'}
                      {l.demaos ? ` · ${l.demaos} demão${l.demaos > 1 ? 's' : ''}` : ''}
                      {l.produto ? ` · ${l.produto}` : ''}
                      {l.inclusao !== 'incluido' ? ` · ${INCLUSION_LABELS[l.inclusao]}` : ''}
                      {l.productId &&
                        products[l.productId] &&
                        (() => {
                          const c = materialCheck(l.quantidade, l.demaos, products[l.productId]!).consumo;
                          return c ? ` · ${litres(c)}` : '';
                        })()}
                    </span>
                    {l.motivoDiferenca && <span className="block text-[15px] text-slate-600">Motivo: {l.motivoDiferenca}</span>}
                  </td>
                  {global && l.trabalho !== 'global' ? (
                    <td colSpan={3} className="py-1.5 text-right text-slate-500">
                      {l.inclusao === 'nao_incluido' ? 'Não incluído' : l.inclusao === 'opcional' ? 'Opcional' : l.inclusao === 'condicionado' ? 'A confirmar' : 'Incluído no preço global'}
                    </td>
                  ) : l.inclusao === 'nao_incluido' ? (
                    <td colSpan={3} className="py-1.5 text-right text-slate-500">
                      Não incluído
                    </td>
                  ) : (
                    <>
                      <td className="py-1.5 text-right">
                        {qty(l.quantidade)} {UNIT_LABELS[l.unidade]}
                      </td>
                      <td className="py-1.5 text-right">{formatEuros(l.precoUnitario)}</td>
                      <td className="py-1.5 text-right">{formatEuros(lineTotal(l))}</td>
                    </>
                  )}
                  {onDelete && <td className="py-1.5 pl-2 text-right">{onDelete(l.id)}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

    </>
  );
  return (
    <div className="space-y-4 text-[17px]">
      {lines.some((l) => hasEquivalent(l.descricao)) && (
        <p className="flex gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-amber-900" role="note">
          <span aria-hidden className="font-bold">(!)</span>
          <span>{EQUIVALENT_PROPOSAL_NOTE}</span>
        </p>
      )}
      <section>
        <h3 className="font-semibold">Resumo por capítulo</h3>
        {byCategory.length === 0 ? (
          <p className="mt-1 text-slate-600">Ainda sem linhas incluídas no preço.</p>
        ) : (
          <dl className="mt-1 divide-y divide-slate-100">
            {byCategory.map(([c, total]) => (
              <div key={c} className="flex justify-between gap-3 py-1.5">
                <dt className="text-slate-600">{LINE_CATEGORY_LABELS[c]}</dt>
                <dd className="font-medium tabular-nums">{formatEuros(total)}</dd>
              </div>
            ))}
          </dl>
        )}
      </section>

      {/*
        Hierarquia dos valores (28/10/2026). Este bloco era uma grelha que no telemóvel se desfazia
        em rótulo numa linha e valor na seguinte — enquanto o "Resumo por capítulo" logo acima
        mantinha rótulo à esquerda e valor à direita. Dois layouts para o mesmo tipo de dado no
        mesmo cartão, e o leitor tinha de reaprender a meio.

        Pior: os seis valores tinham todos o mesmo tamanho, e dois deles — opcionais e
        condicionados — **não entram na conta**. Num ecrã cujo único trabalho é comparar
        propostas, o total comparável passa a ser o maior número da página, e o que não soma vai
        para baixo de uma linha que o diz por extenso.
      */}
      <dl className="divide-y divide-slate-100">
        <div className="flex justify-between gap-3 py-1.5">
          <dt className="text-slate-600">Preço sem IVA (incluído)</dt>
          <dd className="font-medium tabular-nums">{formatEuros(t.base)}</dd>
        </div>
        <div className="flex justify-between gap-3 py-1.5">
          <dt className="text-slate-600">IVA ({terms.ivaBps / 100}%)</dt>
          <dd className="font-medium tabular-nums">{formatEuros(t.iva)}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-3 border-t-2 border-slate-900 pt-2.5">
          <dt className="text-[17px] font-semibold text-slate-900">Total com IVA</dt>
          <dd className="text-[26px] leading-tight font-bold tabular-nums text-slate-900">{formatEuros(t.totalComIva)}</dd>
        </div>
      </dl>

      {(t.opcionais > 0 || t.condicionados > 0) && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-[15px] font-semibold text-slate-700">Não somados no total acima</p>
          <dl className="mt-1 divide-y divide-slate-200">
            {t.opcionais > 0 && (
              <div className="flex justify-between gap-3 py-1.5 text-[15px]">
                <dt className="text-slate-600">Opcionais</dt>
                <dd className="font-medium tabular-nums">{formatEuros(t.opcionais)}</dd>
              </div>
            )}
            {t.condicionados > 0 && (
              <div className="flex justify-between gap-3 py-1.5 text-[15px]">
                <dt className="text-slate-600">Só depois de observar (indicativo)</dt>
                <dd className="font-medium tabular-nums">{formatEuros(t.condicionados)}</dd>
              </div>
            )}
          </dl>
        </div>
      )}

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
        <dt className="text-slate-500">Garantia legal</dt>
        <dd className="sm:text-right">A exigida por lei, que se aplica sempre</dd>
        <dt className="text-slate-500">Garantia adicional da obra</dt>
        <dd className="sm:text-right">{terms.garantiaAnos ? `${terms.garantiaAnos} ${terms.garantiaAnos === 1 ? 'ano' : 'anos'}, além da legal` : 'Nenhuma'}</dd>
        <dt className="text-slate-500">Mão-de-obra</dt>
        <dd className="sm:text-right">Qualificada, incluída no preço{terms.confirmaMaoObra ? '' : ' (por confirmar)'}</dd>
      </dl>
      {(terms.seguroRc === 'nao' || terms.seguroAt === 'nao') && (
        <p className="rounded-lg bg-amber-50 p-3 font-medium text-amber-900" role="alert">
          Atenção: o pintor declara não ter{' '}
          {[terms.seguroRc === 'nao' && 'seguro de responsabilidade civil', terms.seguroAt === 'nao' && 'seguro de acidentes de trabalho']
            .filter(Boolean)
            .join(' nem ')}
          . Quem avançar assume essa responsabilidade.
        </p>
      )}
      {terms.fases.length > 0 && (
        <section>
          <h3 className="font-semibold">Plano de pagamentos</h3>
          <dl className="mt-1 divide-y divide-slate-100">
            {terms.adiantamentoBps > 0 && (
              <div className="flex justify-between gap-3 py-1.5">
                <dt className="text-slate-600">Adiantamento de adjudicação</dt>
                <dd>{terms.adiantamentoBps / 100}% · {formatEuros(percentOf(t.base, terms.adiantamentoBps))}</dd>
              </div>
            )}
            {terms.fases.map((f) => (
              <div key={f.nome} className="flex justify-between gap-3 py-1.5">
                <dt className="text-slate-600">{f.nome}</dt>
                <dd>{f.bps / 100}% · {formatEuros(percentOf(t.base, f.bps))}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-1 text-[15px] text-slate-500">Valores sem IVA. O pagamento é feito diretamente entre as partes.</p>
        </section>
      )}
      {onDelete ? (
        <section>
          <h3 className="font-semibold">Linhas do orçamento</h3>
          <div className="mt-2">{table}</div>
        </section>
      ) : (
        <details className="group rounded-xl border border-slate-200 p-3">
          <summary className="cursor-pointer list-none font-semibold text-tinta-700">
            Ver orçamento discriminado ({lines.length} {lines.length === 1 ? 'linha' : 'linhas'}) <span className="font-normal text-slate-500 group-open:hidden">▾</span>
          </summary>
          <div className="mt-3">{table}</div>
        </details>
      )}
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
      {capoto && <CapotoMateriais spec={capoto} />}
    </div>
  );
}
