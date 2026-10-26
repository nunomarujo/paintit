'use client';

import { useMemo, useRef, useState } from 'react';
import { formatEuros, formatEurosCurto } from '@/domain/money';
import { concentraConvites, temHabito, type EntidadeDoMapa } from '@/domain/mapaContratos';
import {
  combina,
  ordenar,
  sugestoes,
  tipoDaEntidade,
  ORDENS,
  TIPOS,
  type Ordem,
  type TipoDeEntidade,
} from '@/domain/mapaFiltros';

const dataPt = (iso: string) => iso.slice(0, 10).split('-').reverse().join('/');

/**
 * O cabeçalho de busca do mapa e a lista que ele filtra.
 *
 * É cliente por uma razão só: a filtragem tem de responder à tecla. As entidades já vêm somadas da
 * base — 127 linhas, não 9 393 contratos — e por isso filtrar e ordenar aqui é instantâneo e não
 * custa uma ida ao servidor por cada letra escrita.
 *
 * O que a caixa de procura sugere sai **dos próprios dados carregados**: nomes de entidades e nomes
 * de concelhos que existem mesmo nos contratos. Não há lista de palavras-chave inventada, e por isso
 * nunca sugere uma coisa que depois dê zero resultados — o erro que mais desgasta uma busca.
 *
 * O tipo de entidade (câmara, junta, misericórdia, hospital…) não vem do portal: deduz-se do nome
 * publicado, em `mapaFiltros.ts`. É uma aproximação declarada, e serve o que o pintor quer fazer —
 * "mostra-me só as juntas de freguesia" —, não um cadastro.
 */
export function ListaDeEntidades({ todas, nif }: { todas: EntidadeDoMapa[]; nif: string | null }) {
  const [termo, setTermo] = useState('');
  const [aberto, setAberto] = useState(false);
  const [marcado, setMarcado] = useState(-1);
  const [tipos, setTipos] = useState<TipoDeEntidade[]>([]);
  const [concelhos, setConcelhos] = useState<string[]>([]);
  const [ordem, setOrdem] = useState<Ordem>('frequencia');
  const [painel, setPainel] = useState<'tipo' | 'onde' | null>(null);
  const caixa = useRef<HTMLInputElement>(null);

  // Só os tipos e concelhos que existem mesmo nesta vista: um crivo que não devolve nada é um crivo
  // que não devia estar no ecrã.
  const tiposPresentes = useMemo(() => {
    const haver = new Set(todas.map((e) => tipoDaEntidade(e.nome)));
    return TIPOS.filter((t) => haver.has(t.tipo));
  }, [todas]);

  const concelhosPresentes = useMemo(() => {
    const haver = new Set<string>();
    for (const e of todas) for (const c of e.concelhos) haver.add(c);
    return [...haver].sort((a, b) => a.localeCompare(b, 'pt'));
  }, [todas]);

  const propostas = useMemo(() => (aberto ? sugestoes(termo, todas) : []), [aberto, termo, todas]);

  const lista = useMemo(
    () => ordenar(todas.filter((e) => combina(e, { termo, tipos, concelhos })), ordem),
    [todas, termo, tipos, concelhos, ordem],
  );

  const crivado = termo.trim() !== '' || tipos.length > 0 || concelhos.length > 0;

  const alternar = <T,>(lista: T[], valor: T): T[] =>
    lista.includes(valor) ? lista.filter((x) => x !== valor) : [...lista, valor];

  const botaoDeCrivo = (activo: boolean) =>
    `rounded-lg border px-3 py-2 text-[15px] font-semibold transition-colors ${
      activo ? 'border-tinta-600 bg-tinta-50 text-tinta-700' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
    }`;

  const aceitar = (i: number) => {
    const s = propostas[i];
    if (!s) return;
    // Um concelho vira crivo e limpa a caixa; uma entidade fica escrita, porque o nome é a resposta.
    if (s.gentio === 'concelho') {
      setConcelhos((c) => (c.includes(s.valor) ? c : [...c, s.valor]));
      setTermo('');
    } else {
      setTermo(s.valor);
    }
    setAberto(false);
    setMarcado(-1);
  };

  const teclas = (ev: React.KeyboardEvent<HTMLInputElement>) => {
    if (ev.key === 'Escape') {
      setAberto(false);
      setMarcado(-1);
      return;
    }
    if (ev.key === 'Enter') {
      if (marcado >= 0) {
        ev.preventDefault();
        aceitar(marcado);
      } else {
        setAberto(false);
      }
      return;
    }
    if (ev.key !== 'ArrowDown' && ev.key !== 'ArrowUp') return;
    if (propostas.length === 0) return;
    ev.preventDefault();
    setMarcado((i) => {
      const passo = ev.key === 'ArrowDown' ? 1 : -1;
      return (i + passo + propostas.length) % propostas.length;
    });
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="space-y-3 border-b border-slate-200 px-4 py-4 sm:px-5">
        <div>
          <p className="eyebrow">Quem contrata pintura</p>
          <p className="mt-1 text-[15px] text-slate-600">
            Procurar pelo nome da entidade ou do concelho — ou filtrar por tipo e por lugar.
          </p>
        </div>

        {/*
          A procura. `text-[17px]` não é estética: abaixo de 16px o Safari do iPhone dá zoom a cada
          toque. A largura é travada porque uma caixa de 1500px não ajuda a escrever um nome.
        */}
        <div className="relative sm:max-w-xl">
          <input
            ref={caixa}
            type="search"
            value={termo}
            onChange={(ev) => {
              setTermo(ev.target.value);
              setAberto(true);
              setMarcado(-1);
            }}
            onFocus={() => setAberto(true)}
            // `onBlur` com atraso: sem ele, o clique numa sugestão fecha a lista antes de a registar.
            onBlur={() => window.setTimeout(() => setAberto(false), 120)}
            onKeyDown={teclas}
            placeholder="Nome da entidade ou concelho"
            aria-label="Procurar entidade ou concelho"
            autoComplete="off"
            role="combobox"
            aria-expanded={aberto && propostas.length > 0}
            aria-controls="mapa-sugestoes"
            className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-[17px] placeholder:text-slate-500 focus:border-tinta-500 focus:ring-tinta-500"
          />
          {aberto && propostas.length > 0 && (
            <ul
              id="mapa-sugestoes"
              role="listbox"
              className="absolute left-0 right-0 top-full z-20 mt-1 max-h-72 overflow-y-auto rounded-xl border border-slate-300 bg-white py-1 shadow-lg"
            >
              {propostas.map((s, i) => (
                <li key={`${s.gentio}:${s.valor}`} role="option" aria-selected={i === marcado}>
                  <button
                    type="button"
                    onMouseDown={(ev) => ev.preventDefault()}
                    onClick={() => aceitar(i)}
                    onMouseEnter={() => setMarcado(i)}
                    className={`flex w-full items-baseline justify-between gap-3 px-3.5 py-2 text-left text-[17px] ${
                      i === marcado ? 'bg-tinta-50' : ''
                    }`}
                  >
                    <span className="min-w-0 text-slate-900">{s.valor}</span>
                    <span className="shrink-0 text-[13px] font-semibold uppercase tracking-wide text-slate-500">
                      {s.gentio === 'concelho' ? 'concelho' : 'entidade'}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/*
          Os crivos ficam fechados. Num telemóvel de 390px, os oito botões de tipo ocupavam cinco
          linhas antes de se ver um único contrato — o ecrã é para ver quem contrata, não para
          configurar uma busca. O que está escolhido aparece sempre por baixo, para a escolha nunca
          ser estado escondido.
        */}
        <div className="flex flex-wrap items-center gap-2">
          {tiposPresentes.length > 1 && (
            <button
              type="button"
              onClick={() => setPainel((p) => (p === 'tipo' ? null : 'tipo'))}
              aria-expanded={painel === 'tipo'}
              className={botaoDeCrivo(tipos.length > 0)}
            >
              {tipos.length > 0 ? `Tipo: ${tipos.length}` : 'Tipo de entidade'}
            </button>
          )}
          {concelhosPresentes.length > 1 && (
            <button
              type="button"
              onClick={() => setPainel((p) => (p === 'onde' ? null : 'onde'))}
              aria-expanded={painel === 'onde'}
              className={botaoDeCrivo(concelhos.length > 0)}
            >
              {concelhos.length > 0 ? `Concelhos: ${concelhos.length}` : 'Concelho'}
            </button>
          )}
        </div>

        {painel === 'tipo' && (
          <div className="flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
            {tiposPresentes.map((t) => {
              const activo = tipos.includes(t.tipo);
              return (
                <button
                  key={t.tipo}
                  type="button"
                  aria-pressed={activo}
                  onClick={() => setTipos((x) => alternar(x, t.tipo))}
                  className={`rounded-full border px-3 py-1.5 text-[15px] font-semibold transition-colors ${
                    activo
                      ? 'border-tinta-600 bg-tinta-600 text-white'
                      : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        )}

        {painel === 'onde' && concelhosPresentes.length > 1 && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="grid max-h-64 grid-cols-1 gap-x-4 gap-y-1 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">
              {concelhosPresentes.map((c) => (
                <label key={c} className="flex items-center gap-2 py-1 text-[17px] text-slate-800">
                  <input
                    type="checkbox"
                    checked={concelhos.includes(c)}
                    onChange={() => setConcelhos((x) => alternar(x, c))}
                    className="h-5 w-5 rounded border-slate-400 text-tinta-600 focus:ring-tinta-500"
                  />
                  <span className="min-w-0">{c}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/*
          O que está escolhido, em cru e removível — vale mais do que um número num botão fechado.
          Só com os painéis fechados: abertos, estaria duas vezes no mesmo ecrã.
        */}
        {painel === null && (tipos.length > 0 || concelhos.length > 0) && (
          <div className="flex flex-wrap gap-2">
            {tipos.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTipos((x) => alternar(x, t))}
                className="inline-flex items-center gap-1.5 rounded-full bg-tinta-600 px-3 py-1.5 text-[15px] font-semibold text-white"
              >
                {TIPOS.find((x) => x.tipo === t)?.label ?? t}
                <span aria-hidden className="text-[17px] leading-none">×</span>
                <span className="sr-only">tirar este filtro</span>
              </button>
            ))}
            {concelhos.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setConcelhos((x) => alternar(x, c))}
                className="inline-flex items-center gap-1.5 rounded-full bg-tinta-600 px-3 py-1.5 text-[15px] font-semibold text-white"
              >
                {c}
                <span aria-hidden className="text-[17px] leading-none">×</span>
                <span className="sr-only">tirar este filtro</span>
              </button>
            ))}
          </div>
        )}

        {/* A ordem a toda a largura no telemóvel: a 390px o seletor saía fora do ecrã. */}
        <label className="flex flex-col gap-1 text-[15px] text-slate-600 sm:flex-row sm:items-center sm:gap-2">
          <span>Ordenar por</span>
          <select
            value={ordem}
            onChange={(ev) => setOrdem(ev.target.value as Ordem)}
            className="w-full rounded-lg border-slate-300 py-2 pl-3 pr-9 text-[17px] sm:w-auto"
          >
            {ORDENS.map((o) => (
              <option key={o.ordem} value={o.ordem}>
                {o.label}
              </option>
            ))}
          </select>
        </label>

        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <p className="text-[15px] text-slate-600">
            {crivado ? (
              <>
                <strong className="font-semibold text-slate-900">{lista.length}</strong> de {todas.length}{' '}
                {todas.length === 1 ? 'entidade' : 'entidades'}
              </>
            ) : (
              <>
                {todas.length} {todas.length === 1 ? 'entidade' : 'entidades'}
              </>
            )}
          </p>
          {crivado && (
            <button
              type="button"
              onClick={() => {
                setTermo('');
                setTipos([]);
                setConcelhos([]);
                setAberto(false);
                setPainel(null);
                caixa.current?.focus();
              }}
              className="text-[15px] font-semibold text-tinta-700 underline underline-offset-4"
            >
              Limpar filtros
            </button>
          )}
        </div>
      </div>

      {lista.length === 0 ? (
        <p className="px-4 py-6 text-[17px] text-slate-600 sm:px-5">
          Nenhuma entidade assim. Tirar um dos filtros costuma bastar — a procura é feita sobre os nomes que existem
          nos contratos carregados, não sobre todo o país.
        </p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {lista.map((e) => (
            <li key={e.chave} className="px-4 py-3.5 sm:px-5">
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
      )}
      {nif === null && (
        <p className="border-t border-slate-100 px-4 py-3 text-[15px] text-slate-600 sm:px-5">
          Sem o NIF da empresa preenchido, o mapa não a consegue encontrar nas listas de convidados.
        </p>
      )}
    </section>
  );
}
