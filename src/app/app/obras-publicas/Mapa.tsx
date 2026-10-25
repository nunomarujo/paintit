import { formatEuros, formatEurosCurto } from '@/domain/money';
import {
  convidadosDoMapa,
  entidadesDoMapa,
  presencaDaEmpresa,
  resumoDoMapa,
  type LinhaDoMapa,
} from '@/domain/mapaContratos';
import type { Database } from '@/lib/database.types';
import type { SupabaseClient } from '@supabase/supabase-js';

const dataPt = (iso: string) => iso.slice(0, 10).split('-').reverse().join('/');

/**
 * Mapa de contratos públicos. Responde a uma pergunta que nenhuma lista de concursos responde:
 * **quem contrata pintura à volta desta empresa, quanto paga, e quem costuma chamar**.
 *
 * Dois terços das empreitadas de pintura do Estado não são anunciadas a ninguém — são adjudicadas por
 * convite a quem a entidade já conhece. Um alerta de concursos não chega a esse mercado; a lista de
 * convidados, que é pública, chega. Daí a ordem do ecrã: primeiro a própria empresa (quantas vezes já
 * foi convidada, e se o sabia), depois quem contrata, e por fim com quem está a competir.
 *
 * As entidades vêm ordenadas por frequência e não por valor (`entidadesDoMapa`): ao pintor interessa
 * a quem vale a pena bater à porta, e isso mede-se em quantas vezes contrata.
 */
export async function Mapa({
  supabase,
  orgId,
  nif,
}: {
  supabase: SupabaseClient<Database>;
  orgId: string;
  /** O NIF da própria empresa, para a encontrar nas listas de convidados. Pode não estar preenchido. */
  nif: string | null;
}) {
  const { data: prefs } = await supabase
    .from('painter_tender_prefs')
    .select('distritos')
    .eq('org_id', orgId)
    .maybeSingle();
  const distritos = prefs?.distritos ?? [];

  let q = supabase
    .from('public_contracts')
    .select(
      'id_contrato, ano, objecto, entidade_nif, entidade_nome, por_convite, preco_cents, distrito, concelho, data_celebracao, adjudicatario_nif, adjudicatario_nome, convidados',
    )
    .order('data_celebracao', { ascending: false, nullsFirst: false });
  if (distritos.length > 0) q = q.in('distrito', distritos);
  const { data: brutas } = await q;

  const linhas: LinhaDoMapa[] = (brutas ?? []).map((c) => ({
    idContrato: c.id_contrato,
    ano: c.ano,
    objecto: c.objecto,
    entidadeNif: c.entidade_nif,
    entidadeNome: c.entidade_nome,
    porConvite: c.por_convite,
    precoCents: c.preco_cents,
    distrito: c.distrito,
    concelho: c.concelho,
    dataCelebracao: c.data_celebracao,
    adjudicatarioNif: c.adjudicatario_nif,
    adjudicatarioNome: c.adjudicatario_nome,
    convidados: c.convidados ?? [],
  }));

  return <MapaView linhas={linhas} distritos={distritos} nif={nif} />;
}

/**
 * O desenho do mapa, separado da consulta: recebe as linhas e não sabe de onde vêm.
 *
 * A separação serve para o desenhar fora da aplicação — com os 133 contratos reais de Lisboa de 2026,
 * foi assim que se reviu este ecrã antes de existir uma linha na base de dados. Rendeu quatro
 * correcções de texto e dois defeitos nos dados do portal (25/10/2026, docs/DECISOES.md).
 */
export function MapaView({
  linhas,
  distritos,
  nif,
}: {
  linhas: LinhaDoMapa[];
  distritos: string[];
  nif: string | null;
}) {
  const onde = distritos.length > 0 ? distritos.join(', ') : 'todo o país';

  if (linhas.length === 0) {
    return (
      <div className="space-y-4">
        <header className="rounded-2xl border border-slate-200 bg-white px-5 py-4">
          <h2 className="text-lg font-semibold">Quem contrata pintura à sua volta</h2>
          <p className="mt-1 text-[13px] text-slate-600">{onde}</p>
        </header>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
          <p className="font-semibold text-slate-900">O mapa ainda não tem contratos carregados.</p>
          <p className="mt-2">
            Os contratos vêm do portal BASE, pelo conjunto de dados aberto do IMPIC em dados.gov.pt, que é
            actualizado uma vez por semana. A primeira carga percorre os anos de 2012 a {new Date().getFullYear()} e
            demora alguns minutos por ano.
          </p>
          {distritos.length > 0 && (
            <p className="mt-2">
              A vista está limitada a {onde}. Sem contratos nesses distritos, o mapa fica vazio mesmo depois de
              carregado.
            </p>
          )}
        </div>
      </div>
    );
  }

  const r = resumoDoMapa(linhas);
  const entidades = entidadesDoMapa(linhas);
  const convidados = convidadosDoMapa(linhas);
  const eu = presencaDaEmpresa(linhas, nif);
  const anos = r.anos.length > 1 ? `${r.anos[0]}–${r.anos.at(-1)}` : String(r.anos[0] ?? '');

  return (
    <div className="space-y-4">
      <header className="rounded-2xl border border-slate-200 bg-white px-5 py-4">
        <h2 className="text-lg font-semibold">Quem contrata pintura à sua volta</h2>
        <p className="mt-1 text-[13px] text-slate-600">
          {r.entidades} {r.entidades === 1 ? 'entidade' : 'entidades'} · {r.contratos}{' '}
          {r.contratos === 1 ? 'contrato' : 'contratos'} · {formatEurosCurto(r.totalCents)} · {onde} · {anos}
        </p>
      </header>

      {/* A única banda com fundo de cor, e só quando há mesmo um achado: a própria empresa na lista. */}
      {eu.convites > 0 && (
        <div className="rounded-xl border border-tinta-200 bg-tinta-50/70 px-4 py-3 text-[13px] text-slate-800">
          <strong className="font-semibold">
            A sua empresa aparece em {eu.convites} {eu.convites === 1 ? 'convite' : 'convites'} publicados
          </strong>
          {eu.ganhos > 0 ? `, e ficou com ${eu.ganhos} ${eu.ganhos === 1 ? 'obra' : 'obras'}` : ', e não ficou com nenhuma'}
          {'. Convidaram-na: '}
          {/* Três nomes chegam para reconhecer; a lista toda eram sete linhas de parede no telemóvel. */}
          {eu.entidades.slice(0, 3).join(', ')}
          {eu.entidades.length > 3 && ` e mais ${eu.entidades.length - 3}`}.
        </div>
      )}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-5 py-3">
          <p className="eyebrow">Entidades, da que contrata mais vezes para a que contrata menos</p>
        </div>
        <ul className="divide-y divide-slate-100">
          {entidades.map((e) => (
            <li key={e.chave} className="px-5 py-3.5">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <p className="min-w-0 text-sm font-semibold text-slate-900">{e.nome}</p>
                <p className="text-[13px] tabular-nums text-slate-600">
                  {e.contratos} {e.contratos === 1 ? 'contrato' : 'contratos'} · {formatEurosCurto(e.totalCents)}
                </p>
              </div>
              <p className="mt-1 text-[12.5px] leading-relaxed text-slate-600">
                {e.contratos === 1 ? 'Pagou' : 'Costuma pagar'} {formatEuros(e.medianaCents)}
                {e.porConvite > 0 && (
                  <>
                    {' · '}
                    {e.porConvite} de {e.contratos} por convite
                    {e.conviteUnico > 0 && `, ${e.conviteUnico} a uma empresa só`}
                    {/* Sem isto, um número baixo de convites únicos lê-se como abertura da entidade
                        quando pode ser apenas que a lista não foi publicada. Quando são todos, o
                        número repetia-se — "1 de 1 por convite, 1 sem lista publicada". */}
                    {e.semLista > 0 &&
                      (e.semLista === e.porConvite ? ', sem lista publicada' : `, ${e.semLista} sem lista publicada`)}
                  </>
                )}
                {e.ultimo && ` · último em ${dataPt(e.ultimo)}`}
                {e.concelhos.length > 0 && ` · ${e.concelhos.join(', ')}`}
              </p>
            </li>
          ))}
        </ul>
      </section>

      {convidados.length > 0 && (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-5 py-3">
            <p className="eyebrow">Quem costuma ser convidado</p>
            <p className="mt-1 text-[12.5px] text-slate-600">
              Conta convites, não obras ganhas: é esta a lista em que vale a pena entrar.
            </p>
          </div>
          <ul className="divide-y divide-slate-100">
            {convidados.slice(0, 15).map((c) => (
              <li key={c.chave} className="flex items-baseline justify-between gap-4 px-5 py-2.5">
                <span className={`min-w-0 text-[13px] ${c.nif && c.nif === nif ? 'font-semibold text-tinta-700' : 'text-slate-800'}`}>
                  {c.nome}
                  {c.nif && c.nif === nif && ' — a sua empresa'}
                </span>
                <span className="shrink-0 text-[12.5px] tabular-nums text-slate-600">
                  {c.convites} {c.convites === 1 ? 'convite' : 'convites'}
                  {c.ganhos > 0 && `, ${c.ganhos} ${c.ganhos === 1 ? 'obra' : 'obras'}`}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="text-[12px] leading-relaxed text-slate-500">
        Contratos de empreitada já celebrados, do portal BASE pelo conjunto de dados aberto do IMPIC em
        dados.gov.pt, actualizado semanalmente. Dos {r.contratos} aqui, {r.porConvite} foram adjudicados por ajuste
        directo ou consulta prévia — sem anúncio público.
        {r.semLista > 0 &&
          ` Em ${r.semLista} desses, a entidade não publicou quem convidou, por isso o mapa conta essa falta à parte em vez de a somar aos convites a várias empresas.`}{' '}
        O mapa mostra o que o Estado contratou; não é uma lista de concursos a decorrer.
      </p>
    </div>
  );
}
