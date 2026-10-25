import Link from 'next/link';
import { Dossier } from '@/components/Dossier';
import { dossier, resumirDossier } from '@/domain/dossier';
import { formatEuros } from '@/domain/money';
import { WORKSITE_STATE_LABELS, formatQuantidade, saldos, type Consumivel, type Movimento } from '@/domain/worksites';
import { painterOrgs } from '@/lib/queries';
import { getUser } from '@/lib/supabase/server';
import { CreateWorksite } from './WorksiteForms';

/**
 * As obras da empresa — as que vieram da plataforma e as que são dela, ganhas por fora.
 *
 * Até 25/10/2026 este ecrã só mostrava obras contratadas aqui, e por isso estava vazio para quase
 * toda a gente: as ferramentas existiam no código e não existiam para o utilizador. A decisão do
 * promotor foi explícita — estas ferramentas devem funcionar mesmo sem obra ganha na plataforma.
 */
export default async function WorksitesPage() {
  const { supabase, user } = await getUser();
  const orgs = await painterOrgs(supabase, user!.id);
  const org = orgs[0];

  const [{ data: obras }, { data: docs }, { data: consumiveis }, { data: movimentos }] = await Promise.all([
    org ? supabase.from('worksites').select('*').eq('org_id', org.id).order('created_at', { ascending: false }) : Promise.resolve({ data: [] }),
    org ? supabase.from('org_documents').select('kind, status, valido_ate').eq('org_id', org.id) : Promise.resolve({ data: [] }),
    org ? supabase.from('org_consumables').select('*').eq('org_id', org.id) : Promise.resolve({ data: [] }),
    org ? supabase.from('consumable_moves').select('consumable_id, quantidade, worksite_id').eq('org_id', org.id) : Promise.resolve({ data: [] }),
  ]);

  const linhas = dossier((docs ?? []).map((d) => ({ kind: d.kind, status: d.status, validoAte: d.valido_ate })), new Date().toISOString().slice(0, 10));
  const resumo = resumirDossier(linhas);

  const stock = saldos(
    (consumiveis ?? []).map((c) => ({ id: c.id, nome: c.nome, unidade: c.unidade, minimo: c.minimo }) as Consumivel),
    (movimentos ?? []).map((m) => ({ consumableId: m.consumable_id, quantidade: m.quantidade, worksiteId: m.worksite_id }) as Movimento),
  );
  const repor = stock.filter((s) => s.repor);
  const emCurso = (obras ?? []).filter((o) => o.estado === 'ativa');

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Obras</h1>
        <p className="mt-1 max-w-[75ch] text-sm text-slate-600">
          Todas as obras da empresa, venham ou não da Quem Pinta: equipa e horas, cronograma, custos, consumíveis e
          trabalhos a mais. {emCurso.length > 0 ? `${emCurso.length} em curso.` : 'Nenhuma em curso.'}
        </p>
      </div>

      {org && <Dossier linhas={linhas} resumo={resumo} orgId={org.id} />}

      {repor.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-900">
          <strong className="font-semibold">Por repor:</strong>{' '}
          {repor.map((s) => `${s.nome} (${formatQuantidade(s.stock)})`).join(' · ')}.{' '}
          <Link href="/app/obras/consumiveis" className="font-semibold underline underline-offset-4">
            Ver consumíveis
          </Link>
        </div>
      )}

      {(obras ?? []).length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <p className="font-semibold text-slate-900">Ainda não há obras aqui.</p>
          <p className="mt-2 max-w-[70ch] text-sm text-slate-600">
            Não é preciso ter ganho a obra na Quem Pinta para usar estas ferramentas. Acrescente uma obra sua e passa a
            ter num sítio só quem lá anda e quantas horas fez, o cronograma por fases, os custos e o que já recebeu,
            os consumíveis que saíram do armazém, e os trabalhos a mais com o preço aceite.
          </p>
          <div className="mt-4">
            <CreateWorksite />
          </div>
        </div>
      ) : (
        <>
          <ul className="divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 bg-white">
            {(obras ?? []).map((o) => (
              <li key={o.id}>
                <Link href={`/app/obras/${o.id}`} className="block px-4 py-3 hover:bg-slate-50">
                  <div className="flex flex-wrap items-baseline justify-between gap-3">
                    <span className="font-semibold text-slate-900">{o.nome}</span>
                    <span className="tabular-nums text-slate-700">{o.valor_cents !== null ? formatEuros(o.valor_cents) : '—'}</span>
                  </div>
                  <p className="text-[12.5px] text-slate-600">
                    {[o.cliente_nome, o.local].filter(Boolean).join(' · ') || 'Sem cliente nem local indicados'}
                    {' · '}
                    {WORKSITE_STATE_LABELS[o.estado]}
                    {o.engagement_id ? ' · contratada pela Quem Pinta' : ' · obra própria'}
                  </p>
                </Link>
                {o.estado === 'ativa' && (
                  // O registo do dia é a acção diária: fica a um toque da lista, sem abrir a obra.
                  <Link
                    href={`/app/obras/${o.id}?s=dia`}
                    className="mx-4 mb-3 inline-flex items-center rounded-lg border border-tinta-300 bg-white px-3 py-1.5 text-[12px] font-semibold text-tinta-700 hover:bg-tinta-50"
                  >
                    Registar o dia
                  </Link>
                )}
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap items-center gap-4">
            <CreateWorksite />
            <Link href="/app/obras/consumiveis" className="text-sm font-semibold text-tinta-700 underline underline-offset-4">
              Consumíveis e armazém
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
