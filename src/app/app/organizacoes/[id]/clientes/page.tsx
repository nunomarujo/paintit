import Link from 'next/link';
import { notFound } from 'next/navigation';
import { setReferralActive } from '@/app/app/organizacoes/[id]/adesoes/actions';
import { FREQUENT_MIN_ORDERS } from '@/domain/catalog';
import { quandoCurto } from '@/domain/contagem';
import { REFERRAL_BPS } from '@/domain/referral';
import { canManage, myRole } from '@/lib/access';
import { supplierCustomers } from '@/lib/queries';
import { getUser } from '@/lib/supabase/server';
import { NewCodeForm } from '../adesoes/Forms';
import { InviteForm } from './InviteForm';

/**
 * Clientes e convites (reformulado a 01/11/2026).
 *
 * Havia três caminhos para a mesma coisa — trazer um pintor para a empresa — espalhados por dois ecrãs:
 * o convite por email vivia em «Clientes», os códigos de adesão em «Comissões de adesão», e a carteira
 * era um terceiro sítio. Pior: **o convite só aparecia enquanto a carteira estivesse vazia**, por o
 * ecrã o pôr dentro do ramo «sem clientes». Quem tivesse um cliente deixava de poder convidar ninguém.
 *
 * Agora é um destino com três passos: quem já é cliente, quem foi convidado, e os códigos. As comissões
 * ficam onde devem — em «Comissões de adesão», que é dinheiro e não angariação.
 */

const DESCONTO = (REFERRAL_BPS / 100).toLocaleString('pt-PT', { minimumFractionDigits: 2 });

const escalao = (c: { deliveredOrders: number; premium: boolean }) =>
  c.premium
    ? 'Premium'
    : c.deliveredOrders >= FREQUENT_MIN_ORDERS
      ? 'Cliente frequente'
      : c.deliveredOrders === 0
        ? 'Ainda sem entregas'
        : 'Cliente';

export default async function SupplierCustomersPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ver?: string }>;
}) {
  const { id } = await params;
  const { ver } = await searchParams;
  const aba = ver === 'convites' ? 'convites' : ver === 'codigos' ? 'codigos' : 'clientes';

  const { supabase, user } = await getUser();
  const { data: org } = await supabase.from('organizations').select('id, nome, kind, gerida_por').eq('id', id).maybeSingle();
  if (!org || org.kind !== 'fornecedor') notFound();
  const manager = canManage(await myRole(supabase, user!.id, org));

  const [clientes, { data: convites }, { data: codigos }] = await Promise.all([
    supplierCustomers(supabase, id),
    supabase
      .from('supplier_painter_invites')
      .select('id, nome, email, telefone, morada, created_at, referral_codes!inner(code, painter_org_id)')
      .eq('org_id', id)
      .order('created_at', { ascending: false }),
    supabase
      .from('referral_codes')
      .select('id, code, nota, active, painter_org_id, created_at')
      .eq('supplier_org_id', id)
      .order('created_at', { ascending: false }),
  ]);

  const porAceitar = (convites ?? []).filter((i) => !i.referral_codes.painter_org_id).length;
  const agora = new Date();

  const ABAS = [
    ['clientes', 'Clientes', clientes.length, ''],
    ['convites', 'Convites', porAceitar, '?ver=convites'],
    ['codigos', 'Códigos', (codigos ?? []).filter((c) => c.active && !c.painter_org_id).length, '?ver=codigos'],
  ] as const;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[34px] font-bold leading-[1.15] tracking-[-0.025em] text-slate-900">Clientes e convites</h1>
        <p className="mt-1 max-w-[54ch] text-[17px] text-slate-600">
          Os pintores que compram a esta empresa, e as duas maneiras de trazer mais: convidar alguém que já
          conhece, ou dar um código de adesão.
        </p>
      </div>

      <div className="flex gap-1 overflow-x-auto border-b border-slate-200" role="tablist">
        {ABAS.map(([chave, texto, n, q]) => (
          <Link
            key={chave}
            href={`/app/organizacoes/${id}/clientes${q}`}
            aria-current={aba === chave ? 'page' : undefined}
            className={`inline-flex min-h-[44px] shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-3 text-[17px] ${
              aba === chave
                ? 'border-tinta-600 font-semibold text-slate-900'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            {texto}
            {n > 0 && (
              <span
                className={`rounded-full px-1.5 text-[13px] font-semibold ${
                  aba === chave ? 'bg-tinta-600 text-white' : 'bg-slate-200 text-slate-700'
                }`}
              >
                {n}
              </span>
            )}
          </Link>
        ))}
      </div>

      {aba === 'clientes' && (
        <section aria-labelledby="carteira">
          <h2 id="carteira" className="sr-only">
            Carteira de clientes
          </h2>
          {clientes.length === 0 ? (
            <p className="max-w-[54ch] text-[17px] text-slate-600">
              Ainda sem encomendas de nenhum pintor. A carteira preenche-se sozinha à medida que as encomendas
              chegam — ou mais depressa, convidando quem já conhece.
            </p>
          ) : (
            <ul>
              {clientes.map((c) => (
                <li key={c.id} className="border-t border-slate-200 first:border-t-0">
                  <Link
                    href={`/app/organizacoes/${id}/clientes/${c.id}`}
                    className="flex min-h-[44px] items-center justify-between gap-3 rounded-lg px-2 py-3 hover:bg-tinta-50/70"
                  >
                    <span className="min-w-0">
                      <span className="block font-semibold text-slate-900">{c.nome}</span>
                      <span className="block text-[15px] text-slate-600">
                        {escalao(c)} · {c.deliveredOrders} encomenda{c.deliveredOrders === 1 ? '' : 's'} entregue
                        {c.deliveredOrders === 1 ? '' : 's'}
                      </span>
                    </span>
                    {c.nota && <span className="hidden max-w-xs truncate text-[15px] text-slate-600 sm:block">{c.nota}</span>}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {aba === 'convites' && (
        <div className="space-y-6">
          <section aria-labelledby="convidados">
            <h2 id="convidados" className="text-[20px] font-semibold text-slate-900">
              Convites enviados
            </h2>
            {(convites ?? []).length === 0 ? (
              <p className="mt-2 max-w-[54ch] text-[17px] text-slate-600">Ainda não convidou ninguém.</p>
            ) : (
              <ul className="mt-2">
                {(convites ?? []).map((i) => {
                  const q = quandoCurto(agora, new Date(i.created_at));
                  const aceite = !!i.referral_codes.painter_org_id;
                  return (
                    <li
                      key={i.id}
                      className="flex min-h-[44px] flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-2 py-3 first:border-t-0"
                    >
                      <span className="min-w-0">
                        <span className="block font-semibold text-slate-900">{i.nome}</span>
                        <span className="block text-[15px] text-slate-600">
                          {[i.email, i.telefone, i.morada].filter(Boolean).join(' · ')}
                        </span>
                      </span>
                      <span className="shrink-0 text-right">
                        <span className="block font-mono text-[15px] text-slate-700">{i.referral_codes.code}</span>
                        <span className="block text-[15px] text-slate-600">
                          {aceite ? 'aceite' : 'a aguardar'} · {q.dia.toLowerCase()}, {q.hora}
                        </span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {manager && (
            <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
              <h2 className="text-[20px] font-semibold text-slate-900">Convidar um pintor que conhece</h2>
              <p className="mt-1 max-w-[54ch] text-[17px] text-slate-600">
                Um cliente antigo, de fora da plataforma: segue um convite por email para se juntar à Quem
                Pinta já ligado a esta empresa, com um código de adesão.
              </p>
              <dl className="mt-4 grid gap-4 rounded-2xl bg-tinta-50 p-4 text-[17px] sm:grid-cols-2">
                <div>
                  <dt className="font-semibold text-tinta-900">Para a empresa</dt>
                  <dd className="mt-0.5 text-slate-700">
                    O pintor fica ligado a si — entra na carteira de clientes, onde se classifica e se lhe dão
                    descontos próprios.
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold text-tinta-900">Para o pintor</dt>
                  <dd className="mt-0.5 text-slate-700">
                    Entra gratuitamente e fica com {DESCONTO} pontos percentuais de desconto na comissão da
                    plataforma, em todas as obras que ganhar, enquanto a ligação estiver ativa.
                  </dd>
                </div>
              </dl>
              <div className="mt-4">
                <InviteForm orgId={id} />
              </div>
            </section>
          )}
        </div>
      )}

      {aba === 'codigos' && (
        <div className="space-y-6">
          <section aria-labelledby="lista-codigos">
            <h2 id="lista-codigos" className="text-[20px] font-semibold text-slate-900">
              Códigos de adesão
            </h2>
            <p className="mt-1 max-w-[54ch] text-[17px] text-slate-600">
              Um código dá-se a um pintor que ainda não está na plataforma. Quem o usar fica ligado a esta
              empresa.
            </p>
            {(codigos ?? []).length === 0 ? (
              <p className="mt-2 max-w-[54ch] text-[17px] text-slate-600">Ainda não criou nenhum código.</p>
            ) : (
              <ul className="mt-2">
                {(codigos ?? []).map((c) => (
                  <li
                    key={c.id}
                    className="flex min-h-[44px] flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-2 py-3 first:border-t-0"
                  >
                    <span className="min-w-0">
                      <span className="block font-mono text-[17px] font-semibold tracking-wider text-slate-900">
                        {c.code}
                      </span>
                      <span className="block text-[15px] text-slate-600">
                        {!c.active ? 'desativado' : c.painter_org_id ? 'ligado a um pintor' : 'disponível'}
                        {c.nota ? ` · ${c.nota}` : ''}
                      </span>
                    </span>
                    {manager && (
                      <form action={setReferralActive.bind(null, id, c.id, !c.active)}>
                        <button type="submit" className="btn-quiet btn-sm">
                          {c.active ? 'Desativar' : 'Reativar'}
                        </button>
                      </form>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {manager && (
            <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
              <h2 className="text-[20px] font-semibold text-slate-900">Criar um código</h2>
              <div className="mt-4">
                <NewCodeForm orgId={id} />
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
