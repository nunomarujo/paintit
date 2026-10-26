import Link from 'next/link';
import { formatEuros, formatEurosCurto } from '@/domain/money';
import {
  ANOS_DO_MAPA,
  concentraConvites,
  ordenarEntidades,
  temHabito,
  type Mapa as DadosDoMapa,
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
 * As contagens vêm somadas da base (`mapa_contratos`): em bruto eram 5,7 MB por abertura de página.
 */
export async function Mapa({
  supabase,
  orgId,
  nif,
  tudo,
}: {
  supabase: SupabaseClient<Database>;
  orgId: string;
  /** O NIF da própria empresa, para a encontrar nas listas de convidados. Pode não estar preenchido. */
  nif: string | null;
  /** Ver a série toda desde 2012, em vez dos últimos anos. */
  tudo: boolean;
}) {
  const { data: prefs } = await supabase
    .from('painter_tender_prefs')
    .select('distritos')
    .eq('org_id', orgId)
    .maybeSingle();
  const distritos = prefs?.distritos ?? [];
  const desde = tudo ? null : new Date().getFullYear() - (ANOS_DO_MAPA - 1);

  // `undefined` e não `null`: o argumento omitido deixa valer o valor por omissão da função, que é
  // exactamente o que se quer (sem corte de ano, sem NIF). É também a forma que os tipos gerados a
  // partir da base aceitam.
  const { data, error } = await supabase.rpc('mapa_contratos', {
    p_distritos: distritos,
    p_desde: desde ?? undefined,
    p_nif: nif ?? undefined,
  });

  return <MapaView m={(data ?? null) as DadosDoMapa | null} erro={!!error} distritos={distritos} nif={nif} tudo={tudo} />;
}

/**
 * O desenho do mapa, separado da consulta: recebe o que a base já somou e não sabe de onde veio.
 *
 * A separação serve para o desenhar fora da aplicação e olhar para ele em cada largura de ecrã — é
 * assim que se revê um ecrã que só se vê com sessão iniciada.
 */
export function MapaView({
  m,
  erro,
  distritos,
  nif,
  tudo,
}: {
  m: DadosDoMapa | null;
  erro: boolean;
  distritos: string[];
  nif: string | null;
  tudo: boolean;
}) {
  const onde = distritos.length > 0 ? distritos.join(', ') : 'todo o país';

  if (erro || !m || m.resumo.contratos === 0) {
    return (
      <div className="space-y-4">
        <header className="rounded-2xl border border-slate-200 bg-white px-5 py-4">
          <h2 className="text-[20px] font-semibold">Quem contrata pintura à sua volta</h2>
          <p className="mt-1 text-[15px] leading-snug text-slate-600">
            Empreitadas de <strong className="font-semibold">pintura, fachadas e isolamento</strong> adjudicadas por câmaras,
            juntas de freguesia, misericórdias e outras entidades públicas. Não são contratos de todo o tipo: de cada
            ficheiro do portal só ficam os de pintura.
          </p>
          <p className="mt-1 text-[17px] text-slate-600">{onde}</p>
        </header>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-[17px] text-slate-600">
          <p className="font-semibold text-slate-900">
            {erro ? 'O mapa não está disponível de momento.' : 'O mapa ainda não tem contratos carregados.'}
          </p>
          <p className="mt-2">
            Os contratos vêm do portal BASE, pelo conjunto de dados aberto do IMPIC em dados.gov.pt, que é
            actualizado uma vez por semana.
          </p>
          {!erro && distritos.length > 0 && (
            <p className="mt-2">
              A vista está limitada a {onde} e aos últimos {ANOS_DO_MAPA} anos.{' '}
              <Link href="/app/obras-publicas?tudo=1" className="font-semibold text-tinta-700 underline underline-offset-4">
                Ver desde 2012
              </Link>
              .
            </p>
          )}
        </div>
      </div>
    );
  }

  const { resumo: r, convidados, presenca: eu } = m;
  const entidades = ordenarEntidades(m.entidades);
  const anos = r.anos.length > 1 ? `${r.anos[0]}–${r.anos.at(-1)}` : String(r.anos[0] ?? '');

  return (
    <div className="space-y-4">
      <header className="rounded-2xl border border-slate-200 bg-white px-5 py-4">
        <h2 className="text-[20px] font-semibold">Quem contrata pintura à sua volta</h2>
          <p className="mt-1 text-[15px] leading-snug text-slate-600">
            Empreitadas de <strong className="font-semibold">pintura, fachadas e isolamento</strong> adjudicadas por câmaras,
            juntas de freguesia, misericórdias e outras entidades públicas. Não são contratos de todo o tipo: de cada
            ficheiro do portal só ficam os de pintura.
          </p>
        <p className="mt-1 text-[17px] text-slate-600">
          {r.entidades} {r.entidades === 1 ? 'entidade' : 'entidades'} · {r.contratos}{' '}
          {r.contratos === 1 ? 'contrato' : 'contratos'} · {formatEurosCurto(r.totalCents)} · {onde} · {anos}
        </p>
      </header>

      {/* A única banda com fundo de cor, e só quando há mesmo um achado: a própria empresa na lista. */}
      {eu.convites > 0 && (
        <div className="rounded-xl border border-tinta-200 bg-tinta-50/70 px-4 py-3 text-[17px] text-slate-800">
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
          <p className="eyebrow">Quem contrata pintura</p>
          <p className="mt-1 text-[15px] text-slate-600">Por ordem de frequência: primeiro quem contrata mais vezes.</p>
        </div>
        <ul className="divide-y divide-slate-100">
          {entidades.map((e) => (
            <li key={e.chave} className="px-5 py-3.5">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <p className="min-w-0 text-[17px] font-semibold text-slate-900">{e.nome}</p>
                <p className="text-[17px] tabular-nums text-slate-600">
                  {e.contratos} {e.contratos === 1 ? 'contrato' : 'contratos'} · {formatEurosCurto(e.totalCents)}
                </p>
              </div>
              <p className="mt-1 text-[15px] leading-relaxed text-slate-600">
                {/* "Costuma pagar" com um ou dois contratos é uma ocorrência a fingir de hábito. */}
                {temHabito(e) ? 'Costuma pagar' : e.contratos === 1 ? 'Pagou' : 'Pagou, em média,'}{' '}
                {formatEuros(e.medianaCents)}
                {e.porConvite > 0 && (
                  <>
                    {' · '}
                    {e.porConvite} de {e.contratos} por convite
                    {e.conviteUnico > 0 && `, ${e.conviteUnico} a uma empresa só`}
                    {e.semLista > 0 &&
                      (e.semLista === e.porConvite ? ', sem lista publicada' : `, ${e.semLista} sem lista publicada`)}
                  </>
                )}
                {e.ultimo && ` · último em ${dataPt(e.ultimo)}`}
                {e.concelhos.length > 0 &&
                  ` · ${e.concelhos.slice(0, 3).join(', ')}${e.concelhos.length > 3 ? ` e mais ${e.concelhos.length - 3}` : ''}`}
              </p>
              {concentraConvites(e) && (
                <p className="mt-1 text-[15px] font-semibold text-amber-800">
                  Metade ou mais dos convites desta entidade foram a uma empresa só — aqui, estar na lista decide.
                </p>
              )}
            </li>
          ))}
        </ul>
      </section>

      {convidados.length > 0 && (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-5 py-3">
            <p className="eyebrow">Quem costuma ser convidado</p>
            <p className="mt-1 text-[15px] text-slate-600">
              Conta convites, não obras ganhas: é esta a lista em que vale a pena entrar.
            </p>
          </div>
          <ul className="divide-y divide-slate-100">
            {convidados.map((c) => (
              <li key={c.chave} className="flex items-baseline justify-between gap-4 px-5 py-2.5">
                <span className={`min-w-0 text-[17px] ${c.nif && c.nif === nif ? 'font-semibold text-tinta-700' : 'text-slate-800'}`}>
                  {c.nome}
                  {c.nif && c.nif === nif && ' — a sua empresa'}
                </span>
                <span className="shrink-0 text-[15px] tabular-nums text-slate-600">
                  {c.convites} {c.convites === 1 ? 'convite' : 'convites'}
                  {c.ganhos > 0 && `, ${c.ganhos} ${c.ganhos === 1 ? 'obra' : 'obras'}`}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="text-[15px] leading-relaxed text-slate-500">
        Contratos de empreitada já celebrados, do portal BASE pelo conjunto de dados aberto do IMPIC em
        dados.gov.pt, actualizado semanalmente. Dos {r.contratos} aqui, {r.porConvite} foram adjudicados por ajuste
        directo ou consulta prévia — sem anúncio público.
        {r.semLista > 0 &&
          ` Em ${r.semLista} desses, a entidade não publicou quem convidou, por isso o mapa conta essa falta à parte em vez de a somar aos convites a várias empresas.`}{' '}
        O mapa mostra o que o Estado contratou; não é uma lista de concursos a decorrer.{' '}
        <Link
          href={tudo ? '/app/obras-publicas' : '/app/obras-publicas?tudo=1'}
          className="font-semibold text-tinta-700 underline underline-offset-4"
        >
          {tudo ? `Ver só os últimos ${ANOS_DO_MAPA} anos` : 'Ver a série completa desde 2012'}
        </Link>
      </p>
    </div>
  );
}
