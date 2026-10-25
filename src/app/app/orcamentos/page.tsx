import Link from 'next/link';
import { notFound } from 'next/navigation';
import { formatEuros } from '@/domain/money';
import { painterOrgs } from '@/lib/queries';
import { getUser } from '@/lib/supabase/server';
import { CreateQuote } from './QuoteForms';

const ESTADO_LABELS = { rascunho: 'Rascunho', enviado: 'Enviado', ganho: 'Ganho', perdido: 'Perdido' } as const;
const dataPt = (iso: string) => iso.slice(0, 10).split('-').reverse().join('/');

/**
 * Orçamentos que a empresa faz aos clientes dela, fora do mercado da plataforma.
 *
 * A promessa é de tempo: o primeiro leva cerca de 40 minutos porque é ele que ensina os preços à
 * aplicação; do terceiro em diante, 15. Por isso o ecrã mostra quantos preços já estão guardados —
 * é a medida honesta de quanto é que o próximo vai custar em tempo.
 */
export default async function QuotesPage() {
  const { supabase, user } = await getUser();
  const orgs = await painterOrgs(supabase, user!.id);
  const org = orgs[0];
  if (!org) notFound();

  const [{ data: quotes }, { count: precos }] = await Promise.all([
    supabase.from('painter_quotes').select('*').eq('org_id', org.id).order('created_at', { ascending: false }),
    supabase.from('org_price_book').select('id', { count: 'exact', head: true }).eq('org_id', org.id),
  ]);

  const ids = (quotes ?? []).map((q) => q.id);
  const { data: linhas } = ids.length
    ? await supabase.from('painter_quote_lines').select('quote_id, quantidade, preco_unitario, inclusao').in('quote_id', ids)
    : { data: [] };
  const totalDe = (id: string) =>
    (linhas ?? [])
      .filter((l) => l.quote_id === id && l.inclusao === 'incluido')
      .reduce((n, l) => n + Math.round((l.quantidade * l.preco_unitario) / 100), 0);

  const anteriores = (quotes ?? []).map((q) => ({ id: q.id, label: `#${q.numero} — ${q.cliente_nome}` }));
  const guardados = precos ?? 0;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Orçamentos</h1>
        <p className="mt-1 max-w-[75ch] text-sm text-slate-600">
          Os orçamentos que faz aos seus clientes, com o seu logótipo e os seus contactos. Sem comissão e sem passar
          pelo mercado da plataforma.
        </p>
        <p className="mt-2 text-[13px] text-slate-600">
          {guardados === 0
            ? 'Ainda não há preços seus guardados. O primeiro orçamento é o que os ensina à aplicação; a partir daí passam a vir sugeridos.'
            : `${guardados} ${guardados === 1 ? 'preço seu guardado' : 'preços seus guardados'}, a sugerir no orçamento seguinte.`}
        </p>
      </div>

      {(quotes ?? []).length > 0 && (
        <ul className="divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 bg-white">
          {(quotes ?? []).map((q) => (
            <li key={q.id}>
              <Link href={`/app/orcamentos/${q.id}`} className="block px-4 py-3 hover:bg-slate-50">
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <span className="font-semibold text-slate-900">
                    #{q.numero} — {q.cliente_nome}
                  </span>
                  <span className="tabular-nums text-slate-900">{formatEuros(totalDe(q.id))}</span>
                </div>
                <p className="text-[12.5px] text-slate-600">
                  {[q.titulo, q.local].filter(Boolean).join(' · ') || 'Sem título'} · {ESTADO_LABELS[q.estado]} ·{' '}
                  {dataPt(q.created_at)}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-base font-semibold">Orçamento novo</h2>
        <p className="mt-1 max-w-[70ch] text-sm text-slate-600">
          Um orçamento nunca começa em branco: escolha o tipo de obra e os capítulos aparecem pela ordem de execução,
          para tirar o que não quer em vez de se lembrar do que falta.
        </p>
        <div className="mt-4">
          <CreateQuote anteriores={anteriores} />
        </div>
      </section>
    </div>
  );
}
