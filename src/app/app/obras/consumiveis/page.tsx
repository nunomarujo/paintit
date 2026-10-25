import Link from 'next/link';
import { notFound } from 'next/navigation';
import { UNIDADE_LABELS, formatQuantidade, saldos, type Consumivel, type Movimento } from '@/domain/worksites';
import { painterOrgs } from '@/lib/queries';
import { getUser } from '@/lib/supabase/server';
import { AddConsumable, MoveConsumable } from './ConsumableForms';

/**
 * Consumíveis da empresa: fita, rolos, lixas, diluente — o que se gasta em obra e tem de ser reposto.
 *
 * O stock é sempre a soma dos movimentos. Guardá-lo numa coluna daria dois números a dizer o mesmo, e
 * dois números a dizer o mesmo acabam sempre por discordar.
 */
export default async function ConsumablesPage() {
  const { supabase, user } = await getUser();
  const orgs = await painterOrgs(supabase, user!.id);
  const org = orgs[0];
  if (!org) notFound();

  const [{ data: consumiveis }, { data: movimentos }, { data: obras }] = await Promise.all([
    supabase.from('org_consumables').select('*').eq('org_id', org.id),
    supabase.from('consumable_moves').select('consumable_id, quantidade, worksite_id').eq('org_id', org.id),
    supabase.from('worksites').select('id, nome').eq('org_id', org.id).eq('estado', 'ativa').order('created_at', { ascending: false }),
  ]);

  const stock = saldos(
    (consumiveis ?? []).map((c) => ({ id: c.id, nome: c.nome, unidade: c.unidade, minimo: c.minimo }) as Consumivel),
    (movimentos ?? []).map((m) => ({ consumableId: m.consumable_id, quantidade: m.quantidade, worksiteId: m.worksite_id }) as Movimento),
  );
  const opcoesObra = (obras ?? []).map((o) => ({ value: o.id, label: o.nome }));

  return (
    <div className="space-y-5">
      <div>
        <Link href="/app/obras" className="text-sm text-slate-600 hover:underline">
          ← Obras
        </Link>
        <h1 className="mt-3 text-2xl font-semibold">Consumíveis</h1>
        <p className="mt-1 max-w-[70ch] text-sm text-slate-600">
          O que se gasta em obra e tem de ser reposto. O stock é a soma das entradas e das saídas — registe a compra
          quando ela entra e a quantidade quando sai para uma obra.
        </p>
      </div>

      {stock.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <p className="font-semibold text-slate-900">Ainda não há consumíveis no armazém.</p>
          <p className="mt-2 max-w-[70ch] text-sm text-slate-600">
            Comece pelos que lhe faltam sempre a meio da obra: fita de pintor, rolos, lixas, plástico de protecção,
            diluente.
          </p>
          <div className="mt-4">
            <AddConsumable />
          </div>
        </div>
      ) : (
        <>
          <ul className="divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 bg-white">
            {stock.map((s) => (
              <li key={s.id} className="px-4 py-3">
                <details>
                  <summary className="flex cursor-pointer list-none items-baseline justify-between gap-4">
                    <span>
                      <span className="font-semibold text-slate-900">{s.nome}</span>
                      {s.repor && <span className="ml-2 text-[12px] font-semibold text-amber-800">Repor</span>}
                    </span>
                    <span className="tabular-nums text-slate-700">
                      {formatQuantidade(s.stock)} {UNIDADE_LABELS[s.unidade]}
                    </span>
                  </summary>
                  <div className="mt-3 border-t border-slate-100 pt-3">
                    <MoveConsumable consumableId={s.id} obras={opcoesObra} />
                  </div>
                </details>
              </li>
            ))}
          </ul>
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="eyebrow mb-2">Acrescentar consumível</p>
            <AddConsumable />
          </div>
        </>
      )}
    </div>
  );
}
