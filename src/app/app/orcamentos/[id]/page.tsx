import Link from 'next/link';
import { notFound } from 'next/navigation';
import { MiniForm } from '@/components/MiniForm';
import { formatEuros, percentOf } from '@/domain/money';
import { cobertura, type PriceEntry } from '@/domain/priceBook';
import { LINE_CATEGORY_LABELS, UNIT_LABELS } from '@/domain/proposal';
import { lembretes } from '@/domain/quoteTemplates';
import { avisoDePreco, historico } from '@/domain/margin';
import { painterOrgs, painterWorkHistory } from '@/lib/queries';
import { getUser } from '@/lib/supabase/server';
import { saveQuoteTerms, markQuoteSent, setQuoteOutcome } from '../actions';
import { ActionButton } from '../QuoteForms';
import { AddLine, EditLine, RemoveLine } from './LineForms';

const card = 'rounded-2xl border border-slate-200 bg-white p-5';

/** O orçamento em edição. Tudo num ecrã: linhas, condições e o que falta. */
export default async function QuotePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await getUser();
  const orgs = await painterOrgs(supabase, user!.id);
  const org = orgs[0];
  if (!org) notFound();

  const { data: q } = await supabase.from('painter_quotes').select('*').eq('id', id).maybeSingle();
  if (!q) notFound();

  const [{ data: linhas }, { data: book }, obrasFeitas] = await Promise.all([
    supabase.from('painter_quote_lines').select('*').eq('quote_id', id).order('ordem'),
    supabase.from('org_price_book').select('*').eq('org_id', org.id),
    painterWorkHistory(supabase, org.id),
  ]);

  const incluidas = (linhas ?? []).filter((l) => l.inclusao === 'incluido');
  const base = incluidas.reduce((n, l) => n + Math.round((l.quantidade * l.preco_unitario) / 100), 0);
  const iva = percentOf(base, q.iva_bps);

  const entradas: PriceEntry[] = (book ?? []).map((b) => ({
    id: b.id,
    chave: b.chave,
    descricao: b.descricao,
    categoria: b.categoria,
    unidade: b.unidade,
    precoUnitario: b.preco_unitario,
    vezes: b.vezes,
    ultimaVez: b.ultima_vez,
  }));
  const jaConhecidas = cobertura(entradas, (linhas ?? []).map((l) => ({ descricao: l.descricao, unidade: l.unidade, trabalho: l.trabalho })));
  const avisos = lembretes((linhas ?? []).map((l) => l.descricao.toLowerCase()).map((d) => (d.includes('acesso') || d.includes('andaime') ? 'acessos' : d.includes('limpeza') || d.includes('resíduo') ? 'conclusao' : d)));
  const semPreco = (linhas ?? []).filter((l) => l.preco_unitario === 0).length;

  // O que as obras desta empresa têm custado por m², para o preço deste orçamento ser confrontado com
  // a realidade dela — e não com uma média de mercado, que não lhe diz nada (docs/DECISOES.md).
  const passado = historico(obrasFeitas);
  const areaCm2 = incluidas.filter((l) => l.unidade === 'm2').reduce((n, l) => n + l.quantidade, 0);
  const precoPorM2 = areaCm2 > 0 ? Math.round(base / (areaCm2 / 100)) : null;
  const aviso = avisoDePreco(passado, precoPorM2);

  return (
    <div className="space-y-5">
      <div>
        <Link href="/app/orcamentos" className="text-sm text-slate-600 hover:underline">
          ← Orçamentos
        </Link>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">
              Orçamento #{q.numero} — {q.cliente_nome}
            </h1>
            <p className="mt-1 text-sm text-slate-600">{[q.titulo, q.local].filter(Boolean).join(' · ') || 'Sem título'}</p>
          </div>
          <Link href={`/app/orcamentos/${id}/documento`} className="btn-secondary">
            Ver documento
          </Link>
        </div>
      </div>

      {(semPreco > 0 || avisos.length > 0) && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-900">
          {semPreco > 0 && (
            <p>
              <strong className="font-semibold">
                {semPreco} {semPreco === 1 ? 'linha ainda sem preço' : 'linhas ainda sem preço'}.
              </strong>{' '}
              As que ficarem a zero não entram no total.
            </p>
          )}
          {avisos.map((a) => (
            <p key={a} className="mt-1">
              {a}
            </p>
          ))}
        </div>
      )}

      <section className={card}>
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="text-base font-semibold">Trabalhos</h2>
          {entradas.length > 0 && (
            <p className="text-[12px] text-slate-500">
              {Math.round(jaConhecidas * 100)}% destas linhas já tinham preço seu guardado
            </p>
          )}
        </div>

        {(linhas ?? []).length === 0 ? (
          <p className="mt-3 text-sm text-slate-600">Sem linhas. Acrescente a primeira em baixo.</p>
        ) : (
          <table className="mt-3 w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-[11px] uppercase tracking-[0.08em] text-slate-500">
                <th className="pb-2 font-semibold">Trabalho</th>
                <th className="pb-2 text-right font-semibold">Quantidade e preço</th>
                <th className="pb-2 text-right font-semibold">Total</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {(linhas ?? []).map((l) => (
                <tr key={l.id} className="border-b border-slate-100">
                  <td className="py-2 pr-3">
                    <span className="font-medium text-slate-900">{l.descricao}</span>
                    <span className="block text-[11px] text-slate-500">
                      {LINE_CATEGORY_LABELS[l.categoria].split(' (')[0]} · {UNIT_LABELS[l.unidade]}
                    </span>
                  </td>
                  <td className="py-2">
                    <EditLine quoteId={id} lineId={l.id} quantidade={l.quantidade} preco={l.preco_unitario} unidade={l.unidade} />
                  </td>
                  <td className="py-2 text-right font-semibold tabular-nums">
                    {formatEuros(Math.round((l.quantidade * l.preco_unitario) / 100))}
                  </td>
                  <td className="py-2 pl-3 text-right">
                    <RemoveLine quoteId={id} lineId={l.id} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div className="mt-4 border-t border-slate-200 pt-4">
          <AddLine quoteId={id} book={entradas} />
        </div>

        {(passado.obras > 0 || aviso) && (
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-[13px]">
            {passado.custoMedioPorM2 !== null && (
              <p className="text-slate-700">
                As suas obras concluídas custaram, em média,{' '}
                <strong className="font-semibold">{formatEuros(passado.custoMedioPorM2)}/m²</strong>
                {passado.minimoPorM2 !== null && passado.maximoPorM2 !== null && passado.minimoPorM2 !== passado.maximoPorM2 && (
                  <> (entre {formatEuros(passado.minimoPorM2)} e {formatEuros(passado.maximoPorM2)})</>
                )}
                , em {passado.obras} {passado.obras === 1 ? 'obra' : 'obras'}.
                {!passado.suficiente && ' Ainda são poucas para fazer regra.'}
                {precoPorM2 !== null && (
                  <> Neste orçamento está a cobrar <strong className="font-semibold">{formatEuros(precoPorM2)}/m²</strong>.</>
                )}
              </p>
            )}
            {aviso && <p className="mt-1 font-semibold text-amber-800">{aviso}</p>}
          </div>
        )}

        <dl className="mt-5 ml-auto max-w-xs space-y-1 border-t border-slate-200 pt-3 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-slate-600">Sem IVA</dt>
            <dd className="tabular-nums">{formatEuros(base)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-slate-600">IVA ({q.iva_bps / 100}%)</dt>
            <dd className="tabular-nums">{formatEuros(iva)}</dd>
          </div>
          <div className="flex justify-between gap-4 border-t border-slate-200 pt-1 font-semibold text-slate-900">
            <dt>Total</dt>
            <dd className="tabular-nums">{formatEuros(base + iva)}</dd>
          </div>
        </dl>
      </section>

      <section className={card}>
        <h2 className="text-base font-semibold">Condições</h2>
        <div className="mt-3">
          <MiniForm
            action={saveQuoteTerms.bind(null, id)}
            fields={[
              {
                name: 'iva',
                label: 'IVA',
                options: [
                  { value: '600', label: '6% (reabilitação de habitação)' },
                  { value: '2300', label: '23% (taxa normal)' },
                  { value: '1300', label: '13%' },
                  { value: '0', label: '0% (autoliquidação)' },
                ],
              },
              { name: 'validade', label: 'Válido até', type: 'date' },
              { name: 'duracao', label: 'Duração (dias úteis)' },
              { name: 'garantia', label: 'Garantia adicional (anos)' },
              { name: 'exclusoes', label: 'O que não está incluído', type: 'textarea' },
              { name: 'notas', label: 'Notas', type: 'textarea' },
            ]}
            submit="Guardar condições"
          />
        </div>
        <p className="mt-3 text-[12px] text-slate-500">
          A taxa de 6% exige que o imóvel seja habitação e que os materiais não passem 20% do valor global. A decisão é
          sua e do seu contabilista; a plataforma guarda o que escolher, não a valida.
        </p>
      </section>

      <section className={card}>
        <h2 className="text-base font-semibold">Estado</h2>
        <div className="mt-3 flex flex-wrap items-center gap-4">
          {q.estado === 'rascunho' && (
            <ActionButton action={markQuoteSent.bind(null, id)} label="Dar como enviado" pendingLabel="A guardar…" variant="primary" />
          )}
          {q.estado === 'enviado' && (
            <>
              <ActionButton action={setQuoteOutcome.bind(null, id, 'ganho')} label="Ganhei a obra" pendingLabel="A criar a obra…" variant="primary" />
              <ActionButton action={setQuoteOutcome.bind(null, id, 'perdido')} label="Não ganhei" pendingLabel="A registar…" variant="quiet" />
            </>
          )}
          {q.estado === 'ganho' && q.worksite_id && (
            <Link href={`/app/obras/${q.worksite_id}`} className="btn-secondary">
              Abrir a obra
            </Link>
          )}
          {q.estado === 'perdido' && <p className="text-sm text-slate-600">Registado como não ganho.</p>}
        </div>
        {q.estado === 'rascunho' && (
          <p className="mt-2 text-[12px] text-slate-500">
            Ao dar como enviado, os preços deste orçamento ficam guardados e passam a aparecer sugeridos no próximo.
          </p>
        )}
      </section>
    </div>
  );
}
