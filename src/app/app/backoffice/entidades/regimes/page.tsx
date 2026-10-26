import { RegimeForm } from '../../contabilidade/Forms';
import { getUser } from '@/lib/supabase/server';

const card = 'rounded-2xl border border-slate-200 bg-white p-4 sm:p-5';

// Regime de IVA e de retenção declarado por um fornecedor nos dados de pagamento (src/domain/referral.ts).
// A equipa confirma com o contabilista antes de o fornecedor poder resgatar comissões de adesão.
export default async function SupplierRegimesPage() {
  const { supabase } = await getUser();
  const { data: unvalidated } = await supabase.from('supplier_payout_details').select('*').eq('regime_validado', false);
  const orgIds = [...new Set((unvalidated ?? []).map((u) => u.org_id))];
  const { data: orgs } = orgIds.length ? await supabase.from('organizations').select('id, nome, nif').in('id', orgIds) : { data: [] };
  const name = (id: string) => (orgs ?? []).find((o) => o.id === id)?.nome ?? id;
  return (
    <section className={card}>
      <h2 className="font-semibold">Regimes de fornecedores por validar</h2>
      <p className="mt-1 text-sm text-slate-600">Confirme com o contabilista o regime de IVA e a retenção antes de o fornecedor poder resgatar comissões de adesão (ver Contabilidade → A pagar).</p>
      {(unvalidated ?? []).length === 0 ? (
        <p className="mt-3 text-sm text-slate-600">Nenhum por validar.</p>
      ) : (
        <ul className="mt-3 divide-y divide-slate-100 text-sm">
          {(unvalidated ?? []).map((u) => (
            <li key={u.org_id} className="py-3">
              <b>{name(u.org_id)}</b> (NIF {(orgs ?? []).find((o) => o.id === u.org_id)?.nif ?? '—'}) · {u.cobra_iva ? 'liquida IVA' : `isento: ${u.isencao_iva ?? '—'}`} · retenção declarada:{' '}
              {u.declaracao_retencao === 'sujeito' ? 'sujeito' : u.declaracao_retencao === 'dispensa' ? 'dispensado' : u.declaracao_retencao === 'nao_sujeito' ? 'não sujeito' : 'não declarada'}
              <RegimeForm orgId={u.org_id} current={u.retencao_bps} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
