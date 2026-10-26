import { getUser } from '@/lib/supabase/server';
import { CreatePromoCode, TogglePromo } from '../../PromoForms';

const card = 'rounded-2xl border border-slate-200 bg-white p-4 sm:p-5';

export default async function PromoCodesPage() {
  const { supabase } = await getUser();
  const { data: promos } = await supabase.from('promo_codes').select('*').order('created_at', { ascending: false });
  return (
    <section className={card}>
      <h2 className="font-semibold">Códigos promocionais dos fornecedores</h2>
      <p className="mt-1 text-sm text-slate-600">Desconto de 1% a 100% na subscrição do catálogo.</p>
      <div className="mt-4">
        <CreatePromoCode />
      </div>
      {(promos ?? []).length > 0 && (
        <table className="mt-6 w-full text-left text-sm">
          <thead className="text-slate-500">
            <tr>
              <th className="py-1">Código</th>
              <th>Desconto</th>
              <th>Válido até</th>
              <th>Usos</th>
              <th>Notas</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {promos!.map((p) => (
              <tr key={p.id} className={`border-t border-slate-100 ${p.active ? '' : 'text-slate-400'}`}>
                <td className="py-2 font-mono">{p.code}</td>
                <td>{(p.discount_bps / 100).toLocaleString('pt-PT')}%</td>
                <td>{p.valid_until ?? '—'}</td>
                <td>
                  {p.uses}
                  {p.max_uses !== null ? ` / ${p.max_uses}` : ''}
                </td>
                <td>{p.notas ?? ''}</td>
                <td className="text-right">
                  <TogglePromo id={p.id} active={p.active} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
