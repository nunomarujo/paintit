import Link from 'next/link';
import { notFound } from 'next/navigation';
import { formatEuros } from '@/domain/money';
import { painterOrgs } from '@/lib/queries';
import { getUser } from '@/lib/supabase/server';
import { LocalTabs } from '@/components/LocalTabs';
import {
  GRUPOS,
  GRUPO_EXPLICACOES,
  GRUPO_LABELS,
  contarPorGrupo,
  grupoDe,
  orcamentosPorEnviar,
  podeApagar,
  type GrupoOrcamentos,
} from '@/domain/quoteBoard';
import { CreateQuote, RemoveQuote } from './QuoteForms';

const ESTADO_LABELS = { rascunho: 'Rascunho', enviado: 'Enviado', ganho: 'Ganho', perdido: 'Perdido' } as const;
const dataPt = (iso: string) => iso.slice(0, 10).split('-').reverse().join('/');

/**
 * Orçamentos que a empresa faz aos clientes dela, fora do mercado da plataforma.
 *
 * A promessa é de tempo: o primeiro leva cerca de 40 minutos porque é ele que ensina os preços à
 * aplicação; do terceiro em diante, 15. Por isso o ecrã mostra quantos preços já estão guardados —
 * é a medida honesta de quanto é que o próximo vai custar em tempo.
 */
/** Os separadores vivem no endereço: sem estado de cliente, e um link partilhado abre no mesmo sítio. */
export default async function QuotesPage({ searchParams }: { searchParams: Promise<{ ver?: string; grupo?: string }> }) {
  const { ver, grupo } = await searchParams;
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

  const linhasDe = (id: string) => (linhas ?? []).filter((l) => l.quote_id === id).length;
  const doPainel = (quotes ?? []).map((q) => ({
    id: q.id,
    estado: q.estado,
    criadoEm: q.created_at,
    totalCents: totalDe(q.id),
    linhas: linhasDe(q.id),
  }));
  const contagem = contarPorGrupo(doPainel);
  const avisos = orcamentosPorEnviar(doPainel, new Date().toISOString().slice(0, 10));

  // Quem ainda não tem nenhum cai no ecrã de fazer o primeiro; quem já tem, no que andou a fazer.
  const seccao = ver === 'novo' || ver === 'feitos' ? ver : (quotes ?? []).length > 0 ? 'feitos' : 'novo';
  const grupoActivo: GrupoOrcamentos | 'todos' =
    grupo && (GRUPOS as readonly string[]).includes(grupo) ? (grupo as GrupoOrcamentos) : 'todos';
  const total = (quotes ?? []).length;

  const linha = (q: NonNullable<typeof quotes>[number]) => (
    <li key={q.id} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50">
      <Link href={`/app/orcamentos/${q.id}`} className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <span className="font-semibold text-slate-900">
            #{q.numero} — {q.cliente_nome}
          </span>
          <span className="tabular-nums text-slate-900">{formatEuros(totalDe(q.id))}</span>
        </div>
        <p className="text-[15px] text-slate-600">
          {[q.titulo, q.local].filter(Boolean).join(' · ') || 'Sem título'} · {ESTADO_LABELS[q.estado]} · {dataPt(q.created_at)}
          {avisos.some((a) => a.id === q.id) && <span className="ml-1 font-semibold text-amber-800">· por enviar</span>}
        </p>
      </Link>
      {podeApagar(q.estado) && <RemoveQuote quoteId={q.id} numero={q.numero} />}
    </li>
  );

  const grupo1 = (g: GrupoOrcamentos) => {
    const doGrupo = (quotes ?? []).filter((q) => grupoDe(q.estado) === g);
    if (doGrupo.length === 0) return null;
    return (
      <section key={g}>
        <h2 className="text-[17px] font-semibold">{GRUPO_LABELS[g]}</h2>
        <p className="mt-1 max-w-[54ch] text-[17px] text-slate-600">{GRUPO_EXPLICACOES[g]}</p>
        <ul className="mt-3 divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 bg-white xl:grid xl:grid-cols-2 xl:divide-y-0 xl:gap-x-px xl:bg-slate-200">
          {doGrupo.map(linha)}
        </ul>
      </section>
    );
  };

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[26px] leading-tight font-semibold">Orçamentos</h1>
          <p className="mt-1 max-w-[58ch] text-[17px] text-slate-600">
            Os orçamentos que faz aos seus clientes, com o seu logótipo e os seus contactos. Sem comissão e sem passar
            pelo mercado da plataforma.
          </p>
        </div>
        {seccao !== 'novo' && (
          <Link href="/app/orcamentos?ver=novo" className="btn-primary shrink-0">
            Crie orçamento
          </Link>
        )}
      </header>

      {/* O aviso aparece em qualquer separador: é a coisa que o pintor não pode deixar passar. */}
      {avisos.length > 0 && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[17px] text-amber-900">
          <span aria-hidden className="mr-1">⚠</span>
          <strong className="font-semibold">
            {avisos.length === 1 ? 'Há um orçamento feito que nunca foi enviado' : `Há ${avisos.length} orçamentos feitos que nunca foram enviados`}
          </strong>{' '}
          — o mais antigo há {avisos[0]!.dias} dias. Enquanto não os der como enviados, o cliente não os recebeu e os
          preços não ficam guardados.
        </p>
      )}

      {seccao === 'novo' ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-[17px] font-semibold">Orçamento novo</h2>
          <p className="mt-1 max-w-[54ch] text-[17px] text-slate-600">
            Um orçamento nunca começa em branco: escolha o tipo de obra e os capítulos aparecem pela ordem de
            execução, para tirar o que não quer em vez de se lembrar do que falta.
          </p>
          <p className="mt-2 text-[17px] text-slate-600">
            {guardados === 0
              ? 'Ainda não há preços seus guardados. O primeiro orçamento é o que os ensina à aplicação; a partir daí passam a vir sugeridos.'
              : `${guardados} ${guardados === 1 ? 'preço seu guardado' : 'preços seus guardados'}, a sugerir neste.`}
          </p>
          <div className="mt-4">
            <CreateQuote anteriores={anteriores} />
          </div>
        </section>
      ) : (
        <>
          {/* Em preenchimento / Enviados / Arquivo: separadores locais, não mais um nível na barra
              lateral (caderno de desenho da interface, 26/10/2026). */}
          <LocalTabs
            tabs={[
              { href: '/app/orcamentos?ver=feitos', label: `Todos ${total}`, active: grupoActivo === 'todos' },
              ...GRUPOS.map((g) => ({
                href: `/app/orcamentos?ver=feitos&grupo=${g}`,
                label: `${GRUPO_LABELS[g]} ${contagem[g]}`,
                active: grupoActivo === g,
              })),
            ]}
          />
          {total === 0 ? (
            <p className="text-[17px] text-slate-600">Nada aqui.</p>
          ) : grupoActivo === 'todos' ? (
            <div className="space-y-5">{GRUPOS.map(grupo1)}</div>
          ) : (
            grupo1(grupoActivo)
          )}
        </>
      )}
    </div>
  );
}
