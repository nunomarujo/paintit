import Link from 'next/link';
import { setOrderState } from '@/app/app/obras/actions';
import { productLabel } from '@/domain/catalog';
import { quandoCurto } from '@/domain/contagem';
import { getUser } from '@/lib/supabase/server';

/**
 * Encomendas — Vendas (reformulado a 01/11/2026).
 *
 * Era uma lista só, da mais recente para a mais antiga, com as encomendas por despachar misturadas com
 * as já entregues e as canceladas. Quem tinha trinta encomendas antigas procurava as três que exigiam
 * resposta no meio delas.
 *
 * Agora: «À sua espera» e «Fechadas» em separadores, a ação de cada linha à direita, e o que está à
 * espera há mais tempo primeiro — é esse que tem o pintor parado.
 */

const ESTADO: Record<string, { texto: string; nota: string }> = {
  pedida: { texto: 'Por confirmar', nota: 'O pintor está à espera da confirmação da venda.' },
  confirmada: { texto: 'Venda confirmada', nota: 'Falta confirmar a entrega em obra.' },
  entregue: { texto: 'Entregue em obra', nota: 'Fechada.' },
  cancelada: { texto: 'Cancelada', nota: 'Sem efeito.' },
};

export default async function SupplierOrdersPage({ searchParams }: { searchParams: Promise<{ ver?: string }> }) {
  const { ver } = await searchParams;
  const aba = ver === 'fechadas' ? 'fechadas' : 'espera';
  const { supabase, user } = await getUser();

  const { data: memberships } = await supabase
    .from('org_members')
    .select('role, organizations!inner(id, kind)')
    .eq('user_id', user!.id)
    .eq('organizations.kind', 'fornecedor');
  const minhas = (memberships ?? []).map((m) => m.organizations.id);
  const mando = new Set(
    (memberships ?? []).filter((m) => ['proprietario', 'gestor'].includes(m.role)).map((m) => m.organizations.id),
  );

  const { data: orders } = minhas.length
    ? await supabase.from('material_orders').select('*').in('supplier_org_id', minhas).order('created_at')
    : { data: [] };

  const productIds = [...new Set((orders ?? []).map((o) => o.product_id))];
  const painterIds = [...new Set((orders ?? []).map((o) => o.painter_org_id))];
  const [{ data: products }, { data: painters }] = await Promise.all([
    productIds.length ? supabase.from('products').select('*').in('id', productIds) : Promise.resolve({ data: [] }),
    painterIds.length
      ? supabase.from('organizations').select('id, nome, telefone, email_contacto').in('id', painterIds)
      : Promise.resolve({ data: [] }),
  ]);

  // A mais antiga por despachar é a primeira: é essa que tem o pintor parado há mais tempo.
  const espera = (orders ?? []).filter((o) => o.estado === 'pedida' || o.estado === 'confirmada');
  const fechadas = (orders ?? []).filter((o) => o.estado === 'entregue' || o.estado === 'cancelada').reverse();
  const lista = aba === 'fechadas' ? fechadas : espera;
  const porConfirmar = espera.filter((o) => o.estado === 'pedida');
  const agora = new Date();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[34px] font-bold leading-[1.15] tracking-[-0.025em] text-slate-900">Encomendas</h1>
        <p className="mt-1 max-w-[54ch] text-[17px] text-slate-600">
          Encomendas de pintores para obras contratadas na plataforma. Confirmar a venda e a entrega certifica
          ao cliente que o material do contrato foi comprado e entregue.
        </p>
      </div>

      {/* Uma só banda com fundo de cor, no topo (regra 13). */}
      {porConfirmar.length > 0 && (
        <section className="rounded-2xl border border-tinta-200 bg-tinta-50 p-4 sm:p-5">
          <p className="text-[20px] font-semibold text-slate-900">
            {porConfirmar.length === 1
              ? 'Uma encomenda por confirmar'
              : `${porConfirmar.length} encomendas por confirmar`}
          </p>
          <p className="mt-1 max-w-[54ch] text-[17px] text-slate-700">
            Enquanto não houver resposta, o pintor não pode contar com o material.
          </p>
        </section>
      )}

      <div className="flex gap-1 border-b border-slate-200" role="tablist">
        {(
          [
            ['espera', 'À sua espera', espera.length, '/app/encomendas'],
            ['fechadas', 'Fechadas', fechadas.length, '/app/encomendas?ver=fechadas'],
          ] as const
        ).map(([chave, texto, n, href]) => (
          <Link
            key={chave}
            href={href}
            aria-current={aba === chave ? 'page' : undefined}
            className={`inline-flex min-h-[44px] items-center gap-2 whitespace-nowrap border-b-2 px-3 text-[17px] ${
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

      {lista.length === 0 ? (
        <p className="max-w-[54ch] text-[17px] text-slate-600">
          {aba === 'fechadas'
            ? 'Ainda sem encomendas fechadas.'
            : 'Nada à sua espera. As encomendas aparecem aqui sozinhas quando um pintor compromete um produto seu numa proposta e a obra é adjudicada.'}
        </p>
      ) : (
        <ul>
          {lista.map((o) => {
            const p = (products ?? []).find((x) => x.id === o.product_id);
            const pintor = (painters ?? []).find((x) => x.id === o.painter_org_id);
            const mandaNesta = mando.has(o.supplier_org_id);
            const e = ESTADO[o.estado] ?? { texto: o.estado, nota: '' };
            const q = quandoCurto(agora, new Date(o.created_at));
            const porDespachar = o.estado === 'pedida';
            return (
              <li
                key={o.id}
                className="flex min-h-[44px] flex-col gap-3 border-t border-slate-200 px-2 py-3 first:border-t-0 sm:flex-row sm:items-center sm:gap-4"
              >
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-slate-900">
                    {o.embalagens} × {p ? productLabel(p) : 'produto'}
                  </span>
                  <span className="block text-[15px] text-slate-600">
                    {pintor?.nome ?? 'Pintor'}
                    {pintor?.telefone ? ` · ${pintor.telefone}` : ''}
                    {pintor?.email_contacto ? ` · ${pintor.email_contacto}` : ''}
                  </span>
                  {o.nota && <span className="block text-[15px] text-slate-600">Nota: {o.nota}</span>}
                </span>

                <span className="sm:w-[12rem] sm:shrink-0">
                  {/* Alarme em texto dentro de lista, nunca fundo de cor (regra 13). */}
                  <span className={`block text-[17px] ${porDespachar ? 'font-semibold text-amber-800' : 'text-slate-900'}`}>
                    {e.texto}
                  </span>
                  <span className="block text-[15px] text-slate-600">
                    pedida {q.dia.toLowerCase()}, {q.hora}
                  </span>
                </span>

                {mandaNesta && o.estado === 'pedida' && (
                  <form action={setOrderState.bind(null, o.id, 'confirmada', '/app/encomendas')} className="sm:shrink-0">
                    <button type="submit" className="btn-primary">
                      Confirmar venda
                    </button>
                  </form>
                )}
                {mandaNesta && o.estado === 'confirmada' && (
                  <form action={setOrderState.bind(null, o.id, 'entregue', '/app/encomendas')} className="sm:shrink-0">
                    <button type="submit" className="btn-secondary">
                      Confirmar entrega
                    </button>
                  </form>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
