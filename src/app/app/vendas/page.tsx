import Link from 'next/link';
import { notFound } from 'next/navigation';
import { quandoCurto } from '@/domain/contagem';
import { formatEuros } from '@/domain/money';
import { mandaNaEmpresa } from '@/domain/workspaceFornecedor';
import { getUser } from '@/lib/supabase/server';

/**
 * Hoje — Vendas. O início do outro contexto: o que a empresa tem para despachar.
 *
 * A mesma composição de «Hoje — Avaliações»: no topo o que exige ação agora, a seguir o trabalho, e no
 * fim o que se pode ir ver. O que muda é o assunto — aqui é a empresa que trabalha, e não a pessoa.
 */

function Cartao({ titulo, destaque, nota, href, acao }: { titulo: string; destaque?: string; nota: string; href: string; acao: string }) {
  return (
    <Link
      href={href}
      className="flex min-h-[44px] flex-col justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 hover:border-tinta-600 sm:p-5"
    >
      <div>
        <p className="font-semibold text-slate-900">{titulo}</p>
        {destaque && <p className="mt-1 text-[26px] font-semibold leading-tight text-slate-900">{destaque}</p>}
        <p className="mt-1 max-w-[54ch] text-[15px] text-slate-600">{nota}</p>
      </div>
      <span aria-hidden="true" className="text-[15px] font-semibold text-tinta-700">
        {acao} →
      </span>
    </Link>
  );
}

export default async function HojeVendasPage() {
  const { supabase, user } = await getUser();

  const { data: memberships } = await supabase
    .from('org_members')
    .select('org_id, role, organizations!inner(id, kind, nome)')
    .eq('user_id', user!.id)
    .eq('organizations.kind', 'fornecedor');
  const meu = (memberships ?? []).find((m) => ['proprietario', 'gestor', 'vendedor', 'financeiro'].includes(m.role));
  if (!meu) notFound();
  const responsavel = mandaNaEmpresa(meu.role as 'proprietario' | 'gestor' | 'vendedor');

  const [{ data: encomendas }, { data: produtos }, { data: adesao }] = await Promise.all([
    supabase
      .from('material_orders')
      .select('id, estado, embalagens, created_at, product_id')
      .eq('supplier_org_id', meu.org_id)
      .order('created_at', { ascending: false })
      .limit(50),
    supabase.from('products').select('id, marca, nome, ativo').eq('org_id', meu.org_id),
    supabase.from('referral_payouts').select('amount_cents, estado, redemption_id').eq('supplier_org_id', meu.org_id),
  ]);

  const porConfirmar = (encomendas ?? []).filter((e) => e.estado === 'pedida');
  const nomeDe = new Map((produtos ?? []).map((p) => [p.id, `${p.marca} ${p.nome}`]));
  const ativos = (produtos ?? []).filter((p) => p.ativo).length;
  const comissoes = (adesao ?? [])
    .filter((p) => p.estado === 'adjudicada' && !p.redemption_id)
    .reduce((n, p) => n + p.amount_cents, 0);
  const agora = new Date();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[34px] font-bold leading-[1.15] tracking-[-0.025em] text-slate-900">Hoje</h1>
        <p className="mt-1 text-[17px] text-slate-600">
          {new Intl.DateTimeFormat('pt-PT', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Lisbon' })
            .format(agora)
            .replace(/^./, (c) => c.toUpperCase())}
        </p>
      </div>

      {porConfirmar.length > 0 ? (
        <section
          aria-labelledby="agora"
          className="flex flex-col gap-4 rounded-2xl border border-tinta-200 bg-tinta-50 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"
        >
          <div className="min-w-0">
            <h2 id="agora" className="text-[20px] font-semibold text-slate-900">
              {porConfirmar.length === 1
                ? 'Uma encomenda à espera de confirmação'
                : `${porConfirmar.length} encomendas à espera de confirmação`}
            </h2>
            <p className="mt-1 text-[17px] text-slate-700">
              O pintor fica à espera da resposta antes de contar com o material.
            </p>
          </div>
          <Link href="/app/encomendas" className="btn-primary shrink-0">
            Ver encomendas
          </Link>
        </section>
      ) : (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
          <h2 className="text-[20px] font-semibold text-slate-900">Nada à espera de resposta</h2>
          <p className="mt-1 max-w-[54ch] text-[17px] text-slate-600">
            Quando um pintor encomendar material, a encomenda aparece aqui para confirmar.
          </p>
        </section>
      )}

      <section aria-labelledby="encomendas">
        <h2 id="encomendas" className="text-[20px] font-semibold text-slate-900">
          Encomendas recentes
        </h2>
        {(encomendas ?? []).length === 0 ? (
          <p className="mt-2 max-w-[54ch] text-[17px] text-slate-600">Ainda sem encomendas.</p>
        ) : (
          <ul className="mt-2">
            {(encomendas ?? []).slice(0, 6).map((e) => {
              const q = quandoCurto(agora, new Date(e.created_at));
              const porConfirmarEsta = e.estado === 'pedida';
              return (
                <li key={e.id} className="border-t border-slate-200 first:border-t-0">
                  <Link
                    href="/app/encomendas"
                    className="flex min-h-[44px] items-center justify-between gap-3 rounded-lg px-2 py-3 hover:bg-tinta-50/70"
                  >
                    <span className="min-w-0">
                      <span className="block font-semibold text-slate-900">
                        {nomeDe.get(e.product_id) ?? 'Produto'} · {e.embalagens}{' '}
                        {e.embalagens === 1 ? 'embalagem' : 'embalagens'}
                      </span>
                      {/* Alarme em texto dentro de lista, nunca fundo de cor (regra 13). */}
                      <span
                        className={`block text-[15px] ${porConfirmarEsta ? 'font-semibold text-amber-800' : 'text-slate-600'}`}
                      >
                        {porConfirmarEsta ? 'por confirmar' : e.estado}
                      </span>
                    </span>
                    <span className="shrink-0 text-right text-[15px] text-slate-600">
                      {q.dia} · {q.hora}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        <Cartao
          titulo="Catálogo"
          destaque={`${ativos} ${ativos === 1 ? 'produto ativo' : 'produtos ativos'}`}
          nota="Os pintores só veem os produtos ativos ao orçamentar."
          href={`/app/organizacoes/${meu.org_id}/produtos`}
          acao="Produtos e preços"
        />
        {responsavel && (
          <Cartao
            titulo="Comissões de adesão"
            destaque={formatEuros(comissoes)}
            nota="Por receber, dos pintores que aderiram pelo seu código."
            href={`/app/organizacoes/${meu.org_id}/adesoes`}
            acao="Consultar"
          />
        )}
      </div>
    </div>
  );
}
