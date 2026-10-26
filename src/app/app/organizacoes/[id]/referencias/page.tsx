import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { IsoDate } from '@/domain/deadline';
import { combinedPainterDiscountBp, linkedSupplierDiscountBp } from '@/domain/referral';
import { countEligibleReferrals, isReferralEligible, referralDiscountBp, referralWindow, type ReferredSupplier } from '@/domain/referralEligibility';
import { canManage, myRole } from '@/lib/access';
import { linkedSupplierCodes } from '@/lib/queries';
import { getUser } from '@/lib/supabase/server';
import { NewInviteForm } from './Forms';
import { setInviteActive } from './actions';

const card = 'rounded-2xl border border-slate-200 bg-white p-4 sm:p-5';
const ptDate = (iso: string | null) => (iso ? iso.slice(0, 10).split('-').reverse().join('/') : '');
const todayIso = () => new Date().toISOString().slice(0, 10) as IsoDate;

export default async function ReferralsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await getUser();
  const { data: org } = await supabase.from('organizations').select('id, nome, kind, gerida_por').eq('id', id).maybeSingle();
  if (!org || org.kind !== 'pintor') notFound();
  const manager = canManage(await myRole(supabase, user!.id, org));

  const [{ data: invites }, { data: codes }, linkedSupplierCodesList] = await Promise.all([
    supabase
      .from('supplier_referral_invites')
      .select('id, code, nota, active, supplier_org_id, nif, convite_confirmado_em, adesao_elegivel_em')
      .eq('painter_org_id', id)
      .order('created_at', { ascending: false }),
    supabase.from('referral_codes').select('supplier_org_id, active').eq('painter_org_id', id),
    linkedSupplierCodes(supabase, id),
  ]);

  // Um fornecedor pode ter mais do que um código ligado a esta empresa (o fornecedor pode emitir outro código
  // sem desativar o anterior) — conta uma só vez para o desconto (acima) e aparece uma só vez aqui também.
  const linkedSuppliers = [...new Map(linkedSupplierCodesList.map((s) => [s.supplierOrgId, s])).values()];

  const orgIds = [...new Set((invites ?? []).map((i) => i.supplier_org_id).filter((x): x is string => !!x))];
  const { data: suppliers } = orgIds.length ? await supabase.from('organizations').select('id, nome').in('id', orgIds) : { data: [] };
  const nameOf = new Map((suppliers ?? []).map((s) => [s.id, s.nome]));

  const linkedCount = new Set((codes ?? []).filter((c) => c.active).map((c) => c.supplier_org_id)).size;
  const linkedBp = linkedSupplierDiscountBp(linkedCount);
  const referred: ReferredSupplier[] = (invites ?? []).map((i) => ({
    nif: i.nif ?? '',
    conviteConfirmadoEm: (i.convite_confirmado_em?.slice(0, 10) as IsoDate | undefined) ?? null,
    adesaoElegivelEm: (i.adesao_elegivel_em as IsoDate | null) ?? null,
  }));
  const today = todayIso();
  const eligibleCount = countEligibleReferrals(referred, today);
  const referralsBp = referralDiscountBp(eligibleCount);
  const combinedBp = combinedPainterDiscountBp(linkedBp, referralsBp);

  const statusOf = (i: NonNullable<typeof invites>[number]) => {
    if (!i.active) return 'Desativado';
    if (!i.supplier_org_id) return 'Disponível';
    const nome = nameOf.get(i.supplier_org_id) ?? 'O fornecedor';
    if (!i.adesao_elegivel_em) return `${nome} registou-se; a aguardar a 1.ª subscrição`;
    const { until } = referralWindow(i.adesao_elegivel_em as IsoDate);
    const eligible = isReferralEligible(i.adesao_elegivel_em as IsoDate, today);
    return `${nome}: elegível ${eligible ? 'até' : '(terminou em'} ${ptDate(until)}${eligible ? '' : ')'}`;
  };

  return (
    <div className="space-y-8">
      <div>
        <Link href={`/app/organizacoes/${id}`} className="text-sm text-slate-600 hover:underline">
          ← {org.nome}
        </Link>
        <h1 className="mt-3 text-2xl font-semibold">Referências de fornecedores</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-600">
          Crie um código e entregue-o a um fornecedor que ainda não esteja na plataforma. Quando essa empresa se registar com o código e assinar a primeira
          subscrição, conta como uma referência sua durante 12 meses: quantas mais tiver em simultâneo, maior o desconto na sua comissão. Soma-se ao desconto
          dos fornecedores a quem aplicou um código de adesão deles — o conjunto tem um teto de 8 pontos percentuais.
        </p>
      </div>

      <section className="grid gap-4 sm:grid-cols-3">
        {[
          ['Fornecedores com código seu ligados', `${linkedCount} (${(linkedBp / 100).toFixed(2)} p.p.)`],
          ['Referências elegíveis agora', `${eligibleCount} (${(referralsBp / 100).toFixed(2)} p.p.)`],
          ['Desconto atual na comissão', `${(combinedBp / 100).toFixed(2)} p.p.`],
        ].map(([k, v]) => (
          <div key={k} className={card}>
            <p className="text-sm text-slate-600">{k}</p>
            <p className="mt-1 text-2xl font-semibold">{v}</p>
          </div>
        ))}
      </section>

      {linkedSuppliers.length > 0 && (
        <section className={card}>
          <h2 className="font-semibold">Fornecedores com código de adesão ligado</h2>
          <p className="mt-1 text-sm text-slate-600">
            Aplicou um código destes fornecedores a alguma proposta; o desconto que isso dá conta em todas as obras, não só nessa (ver o desconto atual na
            comissão, acima). Para deixar de contar, é o fornecedor que desativa o código do lado dele.
          </p>
          <ul className="mt-3 divide-y divide-slate-100 text-sm">
            {linkedSuppliers.map((s) => (
              <li key={s.id} className="flex items-center justify-between py-2">
                <span>{s.nome}</span>
                <span className="font-mono text-xs text-slate-500">{s.code}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className={card}>
        <h2 className="font-semibold">Códigos de convite</h2>
        {manager && (
          <div className="mt-4">
            <NewInviteForm orgId={id} />
          </div>
        )}
        {(invites ?? []).length === 0 ? (
          <p className="mt-4 text-sm text-slate-600">Ainda não criou nenhum código.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[34rem] text-left text-sm">
              <thead className="text-slate-500">
                <tr>
                  <th className="py-2 font-normal">Código</th>
                  <th className="py-2 font-normal">Nota</th>
                  <th className="py-2 font-normal">Estado</th>
                  <th />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(invites ?? []).map((i) => (
                  <tr key={i.id}>
                    <td className="py-2 font-mono text-base font-semibold tracking-wider">{i.code}</td>
                    <td className="py-2 text-slate-600">{i.nota ?? ''}</td>
                    <td className="py-2">{statusOf(i)}</td>
                    <td className="py-2 text-right">
                      {manager && (
                        <form action={setInviteActive.bind(null, id, i.id, !i.active)}>
                          <button type="submit" className="text-sm text-tinta-700 hover:underline">
                            {i.active ? 'Desativar' : 'Reativar'}
                          </button>
                        </form>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
