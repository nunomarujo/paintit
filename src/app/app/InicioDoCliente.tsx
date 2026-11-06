import Link from 'next/link';
import { horaExata } from '@/domain/contagem';
import { localDate } from '@/domain/deadline';
import { estadoDaEntrega } from '@/domain/entrega';
import { ORG_KIND_LABELS, type OrgKind } from '@/domain/organization';
import type { ProximoPasso } from '@/domain/proximoPasso';
import { CURRENT_RULES } from '@/domain/rules';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';

type Client = SupabaseClient<Database>;

/**
 * O Início de uma conta só de cliente (particular, condomínio ou administradora, sem conta de
 * pintor nem de fornecedor), como aprovado no canvas «Espaço do cliente» (01/11/2026).
 *
 * A página anterior mostrava a estrutura da base: «As suas entidades», «Adicionar entidade», e o
 * pedido numa faixa pequena. Esta mostra o percurso: o que precisa de resposta hoje, as obras em
 * curso com estado e próxima data, e o que protege o cliente. A entidade fica numa linha de rodapé
 * — existe por razão legal (o contrato é com um NIF), não é o assunto da pessoa.
 *
 * Nenhuma regra muda aqui: os dados vêm das mesmas consultas e funções (`estadoDaEntrega`,
 * `survey_schedule_for_client`), só a composição é outra.
 */
export async function InicioDoCliente({
  supabase,
  orgs,
  novoPedidoHref,
  contratacoes,
  avisos,
}: {
  supabase: Client;
  orgs: { id: string; kind: OrgKind; nome: string; localidade: string | null }[];
  novoPedidoHref: string;
  /** Contratações à espera de uma ação do cliente (as mesmas de antes, `availableActions`). */
  contratacoes: { id: string; titulo: string | null; passo: ProximoPasso }[];
  avisos: { id: string; texto: string; link: string; created_at: string }[];
}) {
  const orgIds = orgs.map((o) => o.id);
  const hoje = localDate(new Date(), CURRENT_RULES.timeZone);

  const { data: requests } = await supabase
    .from('work_requests')
    .select('id, titulo, status, ref, prazo_propostas, tipo_obra, org_id')
    .in('org_id', orgIds)
    .in('status', ['rascunho', 'publicado'])
    .order('updated_at', { ascending: false })
    .limit(10);
  const obras = requests ?? [];

  const [surfaces, aCaminho, agendamentos, concelhos] = await Promise.all([
    obras.length
      ? supabase.from('request_surfaces').select('request_id, area_cm2, participacao').in('request_id', obras.map((r) => r.id))
      : Promise.resolve({ data: [] as { request_id: string; area_cm2: number | null; participacao: string | null }[] }),
    Promise.all(
      obras.map(async (r) => {
        if (r.status !== 'publicado') return [r.id, null] as const;
        const { data } = await supabase.rpc('propostas_a_caminho', { p_request: r.id });
        return [r.id, (data as number | null) ?? 0] as const;
      }),
    ),
    Promise.all(
      obras.map(async (r) => {
        const { data } = await supabase.rpc('survey_schedule_for_client', { p_request: r.id });
        const a = data?.[0];
        return a?.por_responder ? ([r.id, a] as const) : null;
      }),
    ),
    supabase.from('buildings').select('org_id, concelho').in('org_id', orgIds),
  ]);
  const aCaminhoPor = new Map(aCaminho);
  const porResponder = agendamentos.filter((x): x is NonNullable<typeof x> => x !== null);
  const areaPor = new Map<string, { zonas: number; area: number }>();
  for (const s of surfaces.data ?? []) {
    const cur = areaPor.get(s.request_id) ?? { zonas: 0, area: 0 };
    cur.zonas += 1;
    if (s.participacao !== 'excluida') cur.area += s.area_cm2 ?? 0;
    areaPor.set(s.request_id, cur);
  }
  const concelhoPor = new Map((concelhos.data ?? []).map((b) => [b.org_id, b.concelho]));
  const pt = (iso: string | null) => (iso ? iso.slice(0, 10).split('-').reverse().slice(0, 2).join('/') : '');
  const m2 = (cm2: number) => `${Math.round(cm2 / 10_000).toLocaleString('pt-PT')} m²`;

  return (
    <div className="mx-auto max-w-4xl space-y-7">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[26px] leading-tight font-semibold">As suas obras</h1>
          <p className="text-[15px] text-slate-500">
            {new Date().toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long', timeZone: CURRENT_RULES.timeZone })}
          </p>
        </div>
        <Link href={novoPedidoHref} className="btn-primary">
          Pedir orçamentos
        </Link>
      </div>

      {/* O que precisa de resposta hoje — um cartão marinho, sempre no topo, só quando há algo. */}
      {porResponder.map(([requestId, a]) => {
        const r = obras.find((o) => o.id === requestId)!;
        return (
          <section key={requestId} className="rounded-2xl bg-tinta-900 p-6 text-white">
            <p className="text-[13px] font-semibold text-lima">Precisa de si</p>
            <h2 className="mt-1 text-[20px] font-bold leading-snug">
              {a.agendado_para
                ? `Um avaliador propôs a visita para ${horaExata(new Date(a.agendado_para))}`
                : 'Um avaliador contactou-o sobre a visita'}
            </h2>
            <p className="mt-1 text-[15px] text-tinta-200">
              {r.titulo} · Confirme a hora ou proponha outra. O avaliador mede e fotografa por si, sem custo.
            </p>
            <Link href={`/app/pedidos/${r.id}`} className="btn-primary mt-4 !bg-lima !text-tinta-900 hover:!bg-lima/90">
              Responder
            </Link>
          </section>
        );
      })}

      {/* O passo à espera dito pelo nome — o primeiro elo do rasto até ao contrato (05/11/2026). */}
      {contratacoes.map((t) => (
        <section key={t.id} className="rounded-2xl bg-tinta-900 p-6 text-white">
          <p className="text-[13px] font-semibold text-lima">Precisa de si</p>
          <h2 className="mt-1 text-[20px] font-bold leading-snug">{t.passo.titulo}</h2>
          <p className="mt-1 max-w-[54ch] text-[15px] text-tinta-200">
            {t.titulo ?? `Contratação ${t.id.slice(0, 8).toUpperCase()}`} · {t.passo.texto}
            {t.passo.ate ? ` Até ${t.passo.ate.split('-').reverse().join('/')}, às 23:59.` : ''}
          </p>
          <Link href={`/app/contratacoes/${t.id}${t.passo.passo === 'assinar' ? '#assinar' : ''}`} className="btn-primary mt-4 !bg-lima !text-tinta-900 hover:!bg-lima/90">
            {t.passo.passo === 'assinar' ? 'Ir para o contrato' : 'Abrir a contratação'}
          </Link>
        </section>
      ))}

      <section>
        <h2 className="font-semibold">Em curso</h2>
        {obras.length === 0 ? (
          <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-6">
            <p className="text-[17px]">Ainda não há nenhuma obra.</p>
            <p className="mt-1 text-[15px] text-slate-600">
              Descreva o que quer pintar — se não souber medir, um avaliador vai ao local sem custo.
            </p>
            <Link href={novoPedidoHref} className="btn-primary mt-4">
              Pedir orçamentos
            </Link>
          </div>
        ) : (
          <ul className="mt-3 space-y-3">
            {obras.map((r) => {
              const entrega = estadoDaEntrega(r.prazo_propostas, hoje, r.status === 'publicado');
              const a = areaPor.get(r.id);
              const estado =
                r.status === 'rascunho'
                  ? { label: 'Em preparação', cor: 'bg-slate-100 text-slate-700' }
                  : entrega.entregues
                    ? { label: 'Propostas abertas', cor: 'bg-tinta-100 text-tinta-900' }
                    : { label: 'A receber propostas', cor: 'bg-tinta-100 text-tinta-900' };
              return (
                <li key={r.id}>
                  <Link
                    href={`/app/pedidos/${r.id}`}
                    className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-4 hover:border-tinta-300 sm:grid-cols-[96px_1fr_auto] sm:items-center"
                  >
                    <span className="hidden h-20 items-center justify-center rounded-lg bg-tinta-100 sm:flex" aria-hidden="true">
                      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#2D5BFF" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 21V8l9-5 9 5v13M7 21v-6h4v6M14 21v-8h4v8" />
                      </svg>
                    </span>
                    <span className="min-w-0">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-full px-2.5 py-0.5 text-[13px] font-semibold ${estado.cor}`}>{estado.label}</span>
                        <span className="text-[13px] text-slate-500">Ref. {r.ref}</span>
                      </span>
                      <span className="mt-1 block text-[20px] font-bold leading-tight text-tinta-900">{r.titulo}</span>
                      <span className="mt-0.5 block text-[15px] text-slate-600">
                        {[a && a.zonas > 0 ? `${a.zonas} ${a.zonas === 1 ? 'zona' : 'zonas'} · ${m2(a.area)}` : null, concelhoPor.get(r.org_id)]
                          .filter(Boolean)
                          .join(' · ')}
                      </span>
                      {r.status === 'publicado' && (
                        <span className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[15px] text-slate-600">
                          {entrega.entregues ? (
                            <span>
                              Pode perguntar até <strong className="text-tinta-900">{pt(entrega.esclarecimentosAte)}</strong>
                            </span>
                          ) : (
                            <>
                              <span>
                                Propostas até <strong className="text-tinta-900">{pt(r.prazo_propostas)}</strong>
                              </span>
                              <span>
                                Abertura <strong className="text-tinta-900">{pt(entrega.abremEm)}</strong>
                              </span>
                              <span>
                                <strong className="text-tinta-900">{aCaminhoPor.get(r.id) ?? 0}</strong> a caminho
                              </span>
                            </>
                          )}
                        </span>
                      )}
                    </span>
                    <span className="font-semibold text-tinta-600">Abrir →</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          {avisos.length === 0 ? (
            <>
              <h2 className="font-semibold">{porResponder.length === 0 && contratacoes.length === 0 ? 'Nada mais por fazer' : 'Depois de responder'}</h2>
              <p className="mt-1 text-[15px] text-slate-600">Quando as propostas abrirem, avisamos por email e aparece aqui em cima.</p>
            </>
          ) : (
            <>
              <h2 className="font-semibold">Avisos</h2>
              <ul className="mt-2 space-y-1">
                {avisos.slice(0, 5).map((n) => (
                  <li key={n.id}>
                    <Link href={n.link} className="inline-flex min-h-[44px] items-center text-[15px] text-tinta-900 hover:underline first-letter:uppercase">
                      {n.texto}
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
        <div className="rounded-2xl border border-slate-200 bg-paper p-5">
          <h2 className="font-semibold">O que o protege</h2>
          <p className="mt-1 text-[15px] text-slate-600">
            Só orçamentam empresas com alvará e seguros verificados. A sua morada e contactos ficam escondidos até
            escolher.
          </p>
          <Link href="/transparencia" className="mt-2 inline-flex min-h-[44px] items-center text-[15px] font-semibold text-tinta-600 hover:underline">
            Ver as três proteções →
          </Link>
        </div>
      </section>

      <p className="text-[13px] text-slate-500">
        {orgs.length === 1 ? (
          <>
            Obra em nome de <strong className="text-slate-600">{orgs[0]!.nome}</strong> ({ORG_KIND_LABELS[orgs[0]!.kind].toLowerCase()}).{' '}
            <Link href={`/app/organizacoes/${orgs[0]!.id}`} className="text-tinta-600 hover:underline">
              Gerir
            </Link>
            .
          </>
        ) : (
          <>
            {orgs.length} entidades:{' '}
            {orgs.map((o, i) => (
              <span key={o.id}>
                {i > 0 && ' · '}
                <Link href={`/app/organizacoes/${o.id}`} className="text-tinta-600 hover:underline">
                  {o.nome}
                </Link>
              </span>
            ))}
            {' · '}
            <Link href="/app/organizacoes/nova" className="text-tinta-600 hover:underline">
              Adicionar
            </Link>
          </>
        )}
      </p>
    </div>
  );
}
