import Link from 'next/link';
import { STATUS_LABELS, availableActions, type Side } from '@/domain/contracting';
import type { Engagement } from '@/domain/engagement';
import { formatEuros } from '@/domain/money';
import { isPlatformAdmin } from '@/lib/access';
import { engagementSide, loadReplay } from '@/lib/engagements';
import type { Database } from '@/lib/database.types';
import { getUser } from '@/lib/supabase/server';

type EngagementRow = Database['public']['Tables']['engagements']['Row'];
type Item = { r: EngagementRow; e: Engagement; titulo: string; precisaDeMim: boolean; pendingPlataforma: boolean; fase: Fase };

type Fase = 'em_curso' | 'assinadas' | 'fechadas';
const FASES: { id: Fase; nome: string; pilula: string }[] = [
  { id: 'em_curso', nome: 'Em curso', pilula: 'bg-tinta-100 text-tinta-900' },
  { id: 'assinadas', nome: 'Assinadas', pilula: 'bg-tinta-900 text-white' },
  { id: 'fechadas', nome: 'Fechadas', pilula: 'bg-slate-100 text-slate-600' },
];
const faseDe = (s: Engagement['status']): Fase =>
  s === 'assinado' ? 'assinadas' : s.startsWith('aguarda_') ? 'em_curso' : 'fechadas';

/**
 * Contratações em áreas por função (promotor, 01/11/2026): à esquerda o que espera por esta conta,
 * à direita as contratações em cartões, por fase. O cliente nunca vê o que a plataforma cobra ao
 * pintor (regra 15): aqui só o valor da obra sem IVA.
 */
export default async function EngagementsPage() {
  const { supabase, user } = await getUser();
  const admin = await isPlatformAdmin(supabase, user!.id);
  const { data: rows } = await supabase.from('engagements').select('*').order('created_at', { ascending: false });
  const ids = [...new Set((rows ?? []).map((r) => r.request_id))];
  const { data: pedidos } = ids.length ? await supabase.from('work_requests').select('id, titulo').in('id', ids) : { data: [] };
  const tituloDe = (id: string) => (pedidos ?? []).find((p) => p.id === id)?.titulo ?? '';

  // Uma contratação malformada não pode derrubar a lista inteira — ficaria invisível aqui, mas visível na
  // fila do backoffice (pendingEngagements, que já isola e reporta o erro).
  const items = (
    await Promise.all(
      (rows ?? []).map(async (r): Promise<Item | null> => {
        try {
          const e = (await loadReplay(supabase, r)).replay.engagement;
          const lado: Side | null = admin ? 'plataforma' : await engagementSide(supabase, user!.id, r);
          const minhas = lado ? availableActions(e, lado) : [];
          return {
            r,
            e,
            titulo: tituloDe(r.request_id),
            precisaDeMim: minhas.length > 0 && lado !== 'plataforma',
            pendingPlataforma: admin && minhas.length > 0,
            fase: faseDe(e.status),
          };
        } catch {
          return null;
        }
      }),
    )
  ).filter((x): x is Item => x !== null);
  const atencao = items.filter((i) => i.precisaDeMim || i.pendingPlataforma);
  const grupos = FASES.map((f) => ({ ...f, itens: items.filter((i) => i.fase === f.id) })).filter((g) => g.itens.length > 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[26px] leading-tight font-semibold">Contratações</h1>
        <p className="mt-1 text-[17px] text-slate-600">Da escolha da proposta à assinatura das duas partes. Depois disso a plataforma só guarda a prova.</p>
      </div>

      {items.length === 0 ? (
        <p className="rounded-2xl border border-slate-200 bg-white p-6 text-[17px] text-slate-600">
          Ainda não há contratações. Uma contratação começa quando o cliente escolhe uma proposta.
        </p>
      ) : (
        <div className="grid gap-5 lg:grid-cols-12">
          <aside className="space-y-4 lg:col-span-3">
            {atencao.length > 0 ? (
              <section className="rounded-2xl bg-tinta-900 p-5 text-white">
                <p className="text-[13px] font-semibold text-lima">Precisa de si</p>
                <p className="mt-1 text-[20px] font-semibold leading-tight">
                  {atencao.length === 1 ? 'Uma contratação espera por si' : `${atencao.length} contratações esperam por si`}
                </p>
                <ul className="mt-3 space-y-2">
                  {atencao.slice(0, 4).map((i) => (
                    <li key={i.r.id}>
                      <Link href={`/app/contratacoes/${i.r.id}`} className="inline-flex min-h-[44px] items-center text-[15px] font-semibold text-lima hover:underline">
                        {i.titulo || `Contratação ${i.r.id.slice(0, 8).toUpperCase()}`}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ) : (
              <section className="rounded-2xl bg-paper p-5">
                <p className="text-[13px] font-semibold text-slate-500">Nada por fazer</p>
                <p className="mt-1 text-[17px]">Avisamos quando um passo for seu.</p>
              </section>
            )}
            <section className="rounded-2xl border border-slate-200 bg-white p-5">
              <h2 className="text-[13px] font-semibold text-slate-500">Em números</h2>
              <dl className="mt-2 grid grid-cols-3 gap-3 lg:grid-cols-1">
                {FASES.map((f) => (
                  <div key={f.id} className="flex items-baseline justify-between gap-2">
                    <dt className="text-[15px] text-slate-600">{f.nome}</dt>
                    <dd className="text-[20px] font-semibold tabular-nums">{items.filter((i) => i.fase === f.id).length}</dd>
                  </div>
                ))}
              </dl>
            </section>
            <section className="rounded-2xl border border-slate-200 bg-white p-5">
              <h2 className="text-[13px] font-semibold text-slate-500">Como funciona</h2>
              <ol className="mt-2 list-decimal space-y-1 pl-4 text-[15px] text-slate-600">
                <li>O cliente escolhe e deposita a garantia</li>
                <li>Assina a minuta com Chave Móvel Digital</li>
                <li>O pintor confirma e assina</li>
              </ol>
            </section>
          </aside>

          <div className="space-y-6 lg:col-span-9">
            {grupos.map((g) => (
              <section key={g.id}>
                <h2 className="flex items-center gap-2 text-[17px] font-semibold">
                  <span className={`rounded-full px-2.5 py-0.5 text-[13px] ${g.pilula}`}>{g.nome}</span>
                  <span className="text-slate-500">{g.itens.length}</span>
                </h2>
                <ul className="mt-3 grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
                  {g.itens.map((i) => (
                    <li key={i.r.id}>
                      <Link href={`/app/contratacoes/${i.r.id}`} className="block h-full rounded-2xl border border-slate-200 bg-white p-5 transition-colors hover:border-tinta-600">
                        <p className="text-[13px] text-slate-500">Contratação {i.r.id.slice(0, 8).toUpperCase()}</p>
                        <h3 className="mt-1 text-[20px] font-semibold leading-tight">{i.titulo || 'Obra'}</h3>
                        <p className="mt-1 text-[15px] text-slate-600">{STATUS_LABELS[i.e.status]}</p>
                        <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-2 border-t border-slate-200 pt-3">
                          <div>
                            <dt className="text-[13px] text-slate-500">Valor sem IVA</dt>
                            <dd className="text-[17px] font-semibold">{formatEuros(i.e.base)}</dd>
                          </div>
                          {(i.precisaDeMim || i.pendingPlataforma) && (
                            <div>
                              <dt className="text-[13px] text-slate-500">Por fazer</dt>
                              <dd className="text-[17px] font-semibold text-amber-800">{i.pendingPlataforma ? 'Confirmação da plataforma' : 'O próximo passo é seu'}</dd>
                            </div>
                          )}
                        </dl>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
