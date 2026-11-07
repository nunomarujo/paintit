import Link from 'next/link';
import { WORK_TYPE_LABELS } from '@/domain/request';
import { CURRENT_RULES } from '@/domain/rules';
import { localDate } from '@/domain/deadline';
import { estadoDaEntrega } from '@/domain/entrega';
import { Dica } from '@/components/Dica';
import { getUser } from '@/lib/supabase/server';

const dataCurta = (iso: string | null) =>
  iso ? new Date(`${iso}T12:00:00`).toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' }) : '—';

/**
 * «As minhas obras» em áreas por função (promotor, 01/11/2026): à esquerda o que pede atenção e
 * os números; à direita as obras em grelha, agrupadas pela fase em que estão — a receber propostas,
 * propostas abertas, em preparação, terminadas. Cada grupo tem a sua cor de pílula, uma só vez, no
 * título do grupo; dentro dos cartões o alarme é texto (regra 13).
 *
 * Refeito a 06/11/2026 (revisão taste-skill): uma lista por fase, em colunas, sem o painel lateral — a grelha
 * de cartões deixava metade do ecrã vazio e o painel repetia os números dos títulos.
 */
export default async function RequestsPage() {
  const { supabase, user } = await getUser();
  const { data: memberships } = await supabase.from('org_members').select('org_id').eq('user_id', user!.id);
  const direct = (memberships ?? []).map((m) => m.org_id);
  const { data: orgs } = direct.length
    ? await supabase.from('organizations').select('id, nome, kind, gerida_por').or(`id.in.(${direct.join(',')}),gerida_por.in.(${direct.join(',')})`)
    : { data: [] };
  const clientOrgs = (orgs ?? []).filter((o) => ['condominio', 'particular'].includes(o.kind));
  const ids = clientOrgs.map((o) => o.id);
  const [{ data: requests }, { data: proposals }] = await Promise.all([
    ids.length ? supabase.from('work_requests').select('*').in('org_id', ids).order('updated_at', { ascending: false }) : Promise.resolve({ data: [] }),
    ids.length ? supabase.from('proposals').select('request_id').neq('status', 'rascunho') : Promise.resolve({ data: [] }),
  ]);
  const hoje = localDate(new Date(), CURRENT_RULES.timeZone);
  const lista = (requests ?? []).map((r) => {
    const entrega = estadoDaEntrega(r.prazo_propostas, hoje, r.status === 'publicado');
    const propostas = (proposals ?? []).filter((p) => p.request_id === r.id).length;
    const fase: Fase =
      r.status === 'rascunho' ? 'preparacao' : r.status === 'publicado' ? (entrega.entregues ? 'abertas' : 'a_receber') : 'terminadas';
    return { r, entrega, propostas, fase };
  });
  const grupos = FASES.map((f) => ({ ...f, obras: lista.filter((o) => o.fase === f.id) })).filter((g) => g.obras.length > 0);
  const nomeDaOrg = (id: string) => clientOrgs.find((o) => o.id === id)?.nome ?? '';
  const porComparar = lista.filter((o) => o.fase === 'abertas');
  const proximaAbertura = lista
    .filter((o) => o.fase === 'a_receber' && o.entrega.abremEm)
    .sort((a, b) => (a.entrega.abremEm! < b.entrega.abremEm! ? -1 : 1))[0];

  const maisDeUmaEntidade = clientOrgs.length > 1;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-semibold leading-tight">
            As minhas obras
            <span className="ml-1 align-middle">
              <Dica rotulo="O que protege">
                Só empresas com alvará e seguros verificados respondem, com propostas discriminadas. As propostas abrem todas ao mesmo tempo e
                o contrato transcreve a proposta escolhida.
              </Dica>
            </span>
          </h1>
          {/* Uma frase com o que está à espera: substitui o cartão «Nada por fazer» e o painel «Em números»,
              cujos números já estão nos títulos dos grupos (um facto dito uma vez). */}
          {lista.length > 0 && (
            <p className="mt-1 text-[17px] text-slate-600">
              {porComparar.length > 0
                ? `${porComparar.length === 1 ? 'Há propostas abertas numa obra' : `Há propostas abertas em ${porComparar.length} obras`}: comparar e escolher.`
                : proximaAbertura
                  ? `Nada por fazer. As próximas propostas abrem a ${dataCurta(proximaAbertura.entrega.abremEm)}.`
                  : 'Nada por fazer. Avisamos quando houver algo que precise de si.'}
            </p>
          )}
        </div>
        {clientOrgs.length > 0 && (
          <Link href={`/app/organizacoes/${clientOrgs[0]!.id}/pedidos/novo`} className="btn-primary">
            Pedir orçamentos
          </Link>
        )}
      </div>

      {clientOrgs.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <p className="text-[17px]">Para pedir orçamentos, registe primeiro um condomínio ou um particular em «Início».</p>
        </div>
      ) : lista.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 p-6">
          <p className="text-[17px]">Ainda não há obras.</p>
          <Link href={`/app/organizacoes/${clientOrgs[0]!.id}/pedidos/novo`} className="btn-primary mt-4">
            Pedir orçamentos
          </Link>
        </div>
      ) : (
        <>
          {grupos.map((g) => (
            <section key={g.id} aria-labelledby={`g-${g.id}`}>
              <h2 id={`g-${g.id}`} className="text-[20px] font-semibold text-slate-900">
                {g.nome} <span className="text-[17px] font-normal tabular-nums text-slate-600">{g.obras.length}</span>
              </h2>
              <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-white">
                {/* Cabeçalho de colunas só em ecrã largo: 13px, cinzento, sem faixa (guia, §7.2). */}
                <div className="hidden grid-cols-[minmax(0,1fr)_9rem_11rem] gap-4 border-b border-slate-200 px-5 py-2 text-[13px] text-slate-600 md:grid">
                  <span>Obra</span>
                  <span className="text-right">{g.colunas[0]}</span>
                  <span className="text-right">{g.colunas[1]}</span>
                </div>
                <ul className="divide-y divide-slate-200">
                  {g.obras.map(({ r, entrega, propostas, fase }) => {
                    const [c1, c2] = valores(fase, r.prazo_propostas, entrega.abremEm, propostas);
                    return (
                      <li key={r.id}>
                        <Link
                          href={`/app/pedidos/${r.id}`}
                          className="grid min-h-[44px] grid-cols-2 gap-x-4 gap-y-1 px-5 py-3 hover:bg-slate-50 focus-visible:bg-slate-50 md:grid-cols-[minmax(0,1fr)_9rem_11rem]"
                        >
                          <span className="col-span-2 min-w-0 md:col-span-1">
                            <span className="block truncate font-semibold text-slate-900">{r.titulo}</span>
                            <span className="block truncate text-[15px] text-slate-600">
                              {[`Ref. ${r.ref}`, WORK_TYPE_LABELS[r.tipo_obra], maisDeUmaEntidade ? nomeDaOrg(r.org_id) : ''].filter(Boolean).join(' · ')}
                            </span>
                          </span>
                          <span className="text-[17px] tabular-nums text-slate-900 md:text-right">
                            <span className="text-[13px] text-slate-600 md:hidden">{g.colunas[0] ? `${g.colunas[0]} ` : ''}</span>
                            {c1.texto}
                          </span>
                          <span
                            className={`text-right text-[17px] tabular-nums ${c2.destaque ? 'font-semibold text-amber-800' : 'text-slate-900'}`}
                          >
                            <span className="text-[13px] font-normal text-slate-600 md:hidden">{g.colunas[1] ? `${g.colunas[1]} ` : ''}</span>
                            {c2.texto}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </section>
          ))}
        </>
      )}
    </div>
  );
}

type Fase = 'abertas' | 'a_receber' | 'preparacao' | 'terminadas';
const FASES: { id: Fase; nome: string; colunas: [string, string] }[] = [
  { id: 'abertas', nome: 'Propostas abertas', colunas: ['Propostas', 'Por fazer'] },
  { id: 'a_receber', nome: 'A receber propostas', colunas: ['Propostas até', 'Abrem'] },
  { id: 'preparacao', nome: 'Em preparação', colunas: ['', 'Por fazer'] },
  { id: 'terminadas', nome: 'Terminadas', colunas: ['Propostas', ''] },
];

type Celula = { texto: string; destaque?: boolean };
const VAZIO: Celula = { texto: '' };

/** O que cada fase mostra nas duas colunas da direita. Alarme em texto âmbar, nunca fundo (regra 13). */
function valores(fase: Fase, prazo: string | null, abremEm: string | null, propostas: number): [Celula, Celula] {
  switch (fase) {
    case 'a_receber':
      return [{ texto: dataCurta(prazo) }, { texto: dataCurta(abremEm) }];
    case 'abertas':
      return [{ texto: String(propostas) }, { texto: 'Comparar', destaque: true }];
    case 'preparacao':
      return [VAZIO, { texto: 'Completar e publicar', destaque: true }];
    case 'terminadas':
      return [{ texto: String(propostas) }, VAZIO];
  }
}
