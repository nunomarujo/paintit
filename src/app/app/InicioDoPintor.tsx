import Link from 'next/link';
import { documentosACaducar, prazosAFechar } from '@/domain/hojeDoPintor';
import { localDate } from '@/domain/deadline';
import { DOC_KIND_LABELS, type DocKind } from '@/domain/organization';
import { WORK_TYPE_LABELS, formatArea, fraseDePrazo, type WorkType } from '@/domain/request';
import { CURRENT_RULES } from '@/domain/rules';
import { contarOrcamentosPorEnviar } from '@/lib/queries';
import type { Database } from '@/lib/database.types';
import type { SupabaseClient } from '@supabase/supabase-js';
import { AvisosDoInicio, type AvisoDoInicio } from './AvisosDoInicio';

const dataCurta = (iso: string) => iso.split('-').reverse().join('/');

/**
 * «Hoje» do pintor (06/11/2026). Pergunta do ecrã: o que pede ação desta empresa hoje? Antes, o Início do
 * pintor era o ecrã genérico do cliente («Pedidos em curso», «As suas entidades»), sem nada do ofício.
 * Ordem: o que espera por si (contratos), os prazos que fecham, o que está a decorrer, as obras, e
 * documentos só quando algum caduca. O alarme é texto (âmbar o que ainda se resolve, vermelho o que já
 * caducou), nunca fundo em linhas: regra 13.
 */
export async function InicioDoPintor({
  supabase,
  orgIds,
  contratacoes,
  avisos,
}: {
  supabase: SupabaseClient<Database>;
  orgIds: string[];
  contratacoes: {
    id: string;
    titulo: string | null;
    passo: { passo: string; titulo: string; ate?: string | null };
  }[];
  avisos: AvisoDoInicio[];
}) {
  const agora = new Date();
  const hoje = localDate(agora, CURRENT_RULES.timeZone);
  const [{ data: abertos }, { data: minhas }, { data: obras }, { data: documentos }, porEnviar] = await Promise.all([
    supabase
      .from('request_listings')
      .select('request_id, ref, concelho, tipo_obra, area_total_cm2, prazo_propostas')
      .eq('aberto', true)
      .order('prazo_propostas')
      .limit(200),
    supabase.from('proposals').select('request_id, status').in('painter_org_id', orgIds),
    supabase
      .from('worksites')
      .select('id, nome, cliente_nome, local, fim')
      .in('org_id', orgIds)
      .eq('estado', 'ativa')
      .order('fim', { ascending: true, nullsFirst: false }),
    supabase.from('org_documents').select('kind, status, valido_ate').in('org_id', orgIds),
    Promise.all(orgIds.map((id) => contarOrcamentosPorEnviar(supabase, id))).then((n) => n.reduce((a, b) => a + b, 0)),
  ]);

  const { linhas, porPropor } = prazosAFechar(abertos ?? [], minhas ?? [], hoje);
  const aEspera = (minhas ?? []).filter((p) => p.status === 'submetida').length;
  const obrasAtivas = obras ?? [];
  const caducam = documentosACaducar(documentos ?? [], hoje);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[26px] leading-tight font-semibold">Hoje</h1>
        <p className="mt-1 text-[17px] text-slate-600">
          {new Intl.DateTimeFormat('pt-PT', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            timeZone: CURRENT_RULES.timeZone,
          })
            .format(agora)
            .replace(/^./, (c) => c.toUpperCase())}
        </p>
      </div>

      {/* A única banda de cor do ecrã, no topo: o que espera por esta conta. Sem nada, o quadro fica e diz-o. */}
      {contratacoes.length > 0 ? (
        <section aria-labelledby="precisa" className="rounded-2xl border border-tinta-200 bg-tinta-50 p-4 sm:p-5">
          <h2 id="precisa" className="text-[20px] font-semibold text-slate-900">
            {contratacoes.length === 1 ? 'Uma contratação precisa de si' : `${contratacoes.length} contratações precisam de si`}
          </h2>
          <ul className="mt-2 divide-y divide-tinta-200">
            {contratacoes.map((t, i) => (
              <li key={t.id} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                <span className="min-w-0">
                  <span className="block font-semibold text-slate-900">{t.passo.titulo}</span>
                  <span className="block text-[15px] text-slate-700">
                    {t.titulo ?? `Contratação ${t.id.slice(0, 8).toUpperCase()}`}
                    {t.passo.ate ? ` · até ${dataCurta(t.passo.ate)}` : ''}
                  </span>
                </span>
                <Link
                  href={`/app/contratacoes/${t.id}${t.passo.passo === 'assinar' ? '#assinar' : ''}`}
                  className={`${i === 0 ? 'btn-primary' : 'btn-secondary'} shrink-0`}
                >
                  {t.passo.passo === 'assinar' ? 'Ir para o contrato' : 'Abrir a contratação'}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
          <h2 className="text-[20px] font-semibold text-slate-900">Nada à espera de si</h2>
          <p className="mt-1 max-w-[54ch] text-[17px] text-slate-600">Contratos para assinar, pagar ou confirmar aparecem aqui.</p>
        </section>
      )}

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="min-w-0 space-y-4">
          <section aria-labelledby="prazos" className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 id="prazos" className="text-[20px] font-semibold text-slate-900">
                Prazos a fechar
              </h2>
              <Link href="/app/oportunidades" className="inline-flex min-h-[44px] items-center text-[17px] text-tinta-700 hover:underline">
                Ver as oportunidades
              </Link>
            </div>
            {linhas.length === 0 ? (
              <p className="max-w-[54ch] text-[17px] text-slate-600">Nenhum pedido aberto fecha nos próximos 7 dias.</p>
            ) : (
              <ul className="mt-1 divide-y divide-slate-200">
                {linhas.map((l) => (
                  <li key={l.requestId}>
                    <Link
                      href={`/app/oportunidades/${l.requestId}`}
                      className="flex min-h-[44px] items-start justify-between gap-4 py-3 hover:bg-slate-50"
                    >
                      <span className="min-w-0">
                        <span className="block font-semibold text-slate-900">
                          {WORK_TYPE_LABELS[l.tipoObra as WorkType] ?? l.tipoObra} · {l.concelho}
                        </span>
                        <span className="block text-[15px] text-slate-600">
                          Pedido {l.ref} · {formatArea(l.areaCm2)}
                        </span>
                        {l.estado === 'rascunho' && (
                          <span className="block text-[15px] font-semibold text-tinta-700">Proposta em rascunho</span>
                        )}
                      </span>
                      <span
                        className={`shrink-0 text-right text-[15px] tabular-nums ${l.nivel === 'normal' ? 'text-slate-600' : 'font-semibold text-amber-800'}`}
                      >
                        {fraseDePrazo(l)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="obras" className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 id="obras" className="text-[20px] font-semibold text-slate-900">
                Obras em curso
              </h2>
              <Link href="/app/obras" className="inline-flex min-h-[44px] items-center text-[17px] text-tinta-700 hover:underline">
                Gestão de obra
              </Link>
            </div>
            {obrasAtivas.length === 0 ? (
              <p className="max-w-[54ch] text-[17px] text-slate-600">Nenhuma obra em curso. Uma obra adjudicada passa a aparecer aqui.</p>
            ) : (
              <ul className="mt-1 divide-y divide-slate-200">
                {obrasAtivas.slice(0, 4).map((o) => (
                  <li key={o.id}>
                    <Link
                      href={`/app/obras/${o.id}`}
                      className="flex min-h-[44px] items-start justify-between gap-4 py-3 hover:bg-slate-50"
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-semibold text-slate-900">{o.nome}</span>
                        <span className="block truncate text-[15px] text-slate-600">
                          {[o.cliente_nome, o.local].filter(Boolean).join(' · ') || '—'}
                        </span>
                      </span>
                      <span className="shrink-0 text-right text-[15px] tabular-nums text-slate-600">
                        {o.fim ? `até ${dataCurta(o.fim)}` : '—'}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <div className="min-w-0 space-y-4">
          <section aria-labelledby="decorrer" className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 id="decorrer" className="text-[20px] font-semibold text-slate-900">
              A decorrer
            </h2>
            <ul className="mt-1 divide-y divide-slate-200">
              {[
                {
                  href: '/app/orcamentos',
                  rotulo: 'Orçamentos por enviar',
                  n: porEnviar,
                },
                {
                  href: '/app/oportunidades',
                  rotulo: 'Propostas à espera de resposta',
                  n: aEspera,
                },
                {
                  href: '/app/oportunidades',
                  rotulo: 'Pedidos abertos por propor',
                  n: porPropor,
                },
                {
                  href: '/app/obras',
                  rotulo: 'Obras em curso',
                  n: obrasAtivas.length,
                },
              ].map((r) => (
                <li key={r.rotulo}>
                  <Link href={r.href} className="flex min-h-[44px] items-center justify-between gap-4 py-2 text-[17px] hover:bg-slate-50">
                    <span className="text-slate-700">{r.rotulo}</span>
                    <span className="font-semibold tabular-nums text-slate-900">{r.n}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          {caducam.length > 0 && (
            <section aria-labelledby="docs" className="rounded-2xl border border-slate-200 bg-white p-5">
              <h2 id="docs" className="text-[20px] font-semibold text-slate-900">
                Documentos a caducar
              </h2>
              <ul className="mt-1 divide-y divide-slate-200">
                {caducam.map((d) => (
                  <li key={d.kind}>
                    <Link
                      href={`/app/organizacoes/${orgIds[0]}?ver=documentos`}
                      className="flex min-h-[44px] items-center justify-between gap-4 py-2 text-[17px] hover:bg-slate-50"
                    >
                      <span className="min-w-0 text-slate-700">{DOC_KIND_LABELS[d.kind as DocKind] ?? d.kind}</span>
                      {/* Vermelho só para o que já caducou; o que ainda se resolve é âmbar (regra 13). */}
                      <span
                        className={`shrink-0 text-right text-[15px] font-semibold tabular-nums ${d.dias < 0 ? 'text-red-700' : 'text-amber-800'}`}
                      >
                        {d.dias < 0
                          ? `caducou há ${-d.dias} ${d.dias === -1 ? 'dia' : 'dias'}`
                          : d.dias === 0
                            ? 'caduca hoje'
                            : `caduca em ${d.dias} ${d.dias === 1 ? 'dia' : 'dias'}`}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
          <AvisosDoInicio avisos={avisos} />
        </div>
      </div>
    </div>
  );
}
