import Link from 'next/link';
import { notFound } from 'next/navigation';
import { formatEuros } from '@/domain/money';
import { PRECO_ATUAL, subscriberDiscountBp } from '@/domain/painterPlan';
import { LocalTabs } from '@/components/LocalTabs';
import { Concursos } from './Concursos';
import { Mapa } from './Mapa';
import { painterSubscription } from '@/lib/queries';
import { getUser } from '@/lib/supabase/server';

/**
 * Mapa de contratos públicos (25/10/2026). A secção tem duas vistas, e a ordem delas é a decisão:
 *
 * - **o mapa**, por omissão — quem contrata pintura à volta da empresa, quanto paga e quem chama;
 * - **os concursos abertos**, à parte — os que são anunciados, que são a minoria do mercado.
 *
 * Durante meses isto foi só a segunda lista. Medido o ficheiro do portal BASE, dois terços das
 * empreitadas de pintura do Estado nunca chegam a concurso: são convites a quem a entidade conhece.
 * Vender um alerta de concursos como se fosse acesso à obra pública era vender um terço do mercado.
 */
export default async function PublicContractsPage({
  searchParams,
}: {
  searchParams: Promise<{ ver?: string; todos?: string; tudo?: string; pais?: string }>;
}) {
  const { ver, todos, tudo, pais } = await searchParams;

  const { supabase, user } = await getUser();
  // `painterOrgs` não traz o NIF, e aqui é ele que encontra a empresa nas listas de convidados.
  const { data: membros } = await supabase
    .from('org_members')
    .select('organizations!inner(id, nif, kind)')
    .eq('user_id', user!.id)
    .eq('organizations.kind', 'pintor');
  const org = (membros ?? [])[0]?.organizations;
  if (!org) notFound();

  const subscricao = await painterSubscription(supabase, org.id);
  const pro = subscriberDiscountBp(subscricao, new Date().toISOString().slice(0, 10)) > 0;
  if (!pro) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <h1 className="text-[26px] leading-tight font-semibold">Mapa de contratos públicos</h1>
        <div className="rounded-2xl border border-tinta-200 bg-tinta-50/60 p-6">
          <p className="text-[17px] text-slate-700">
            Dois terços das empreitadas de pintura do Estado não são anunciadas a ninguém: a entidade convida
            directamente quem já conhece. Os nomes das empresas convidadas são públicos, e é deles que se faz o mapa —
            que câmaras, juntas de freguesia e misericórdias contratam pintura perto de si, quanto pagam e quem
            costumam chamar. Inclui também os concursos que são anunciados, filtrados para pintura e isolamento, com o
            veredicto de elegibilidade à cabeça de cada um.
          </p>
          <p className="mt-3 text-[17px] text-slate-700">
            Faz parte do plano Pro, a partir de {formatEuros(PRECO_ATUAL.mensalCents)} por mês, + IVA.
          </p>
          <Link href="/app/subscricao" className="btn-primary mt-4">
            Ver o plano
          </Link>
        </div>
      </div>
    );
  }

  const emConcursos = ver === 'concursos';

  return (
    <div className="space-y-5">
      <h1 className="text-[26px] leading-tight font-semibold">Obra pública</h1>
      <LocalTabs
        tabs={[
          { href: '/app/obras-publicas', label: 'Quem contrata', active: !emConcursos },
          { href: '/app/obras-publicas?ver=concursos', label: 'Concursos', active: emConcursos },
        ]}
      />
      {emConcursos ? (
        <Concursos supabase={supabase} orgId={org.id} soElegiveis={todos !== '1'} />
      ) : (
        <Mapa supabase={supabase} orgId={org.id} nif={org.nif} tudo={tudo === '1'} pais={pais === '1'} />
      )}
    </div>
  );
}
