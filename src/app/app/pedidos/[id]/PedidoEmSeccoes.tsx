'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';
import { ESTADO_DA_SECCAO_LABELS, type EstadoDaSeccao, type SeccaoId } from '@/domain/seccoes';

/**
 * A página do pedido, em secções que **trocam o conteúdo visível**.
 *
 * ## A exigência, e como está cumprida
 *
 * «Os separadores têm de trocar o conteúdo visível, não apenas saltar para pontos de uma página
 * interminável» (promotor, 30/10/2026). Trocam.
 *
 * ## E a outra exigência, que é mais difícil
 *
 * «Navegar directamente para outra secção também deve preservar as alterações ou pedir uma decisão
 * explícita.» A maneira habitual de o conseguir é detectar alterações por guardar e abrir um
 * diálogo — e um diálogo a interromper quem só quer ver outra secção é mau. A alternativa é não
 * precisar dele: as secções **escondem-se, não se desmontam**. O que está escrito num campo
 * continua escrito quando se volta, porque o campo nunca deixou de existir, e o formulário dos
 * dados do pedido é **um só** para as duas secções que o usam. Não há nada a perder, e por isso não
 * há nada a perguntar.
 *
 * Isto também arruma a gravação: «Guardar e continuar» grava o formulário inteiro, não meia secção,
 * e a publicação valida o que acabou de gravar.
 *
 * ## No computador e no telemóvel
 *
 * No computador, a navegação é uma coluna estreita à esquerda — e só uma, porque a barra lateral da
 * aplicação já existe e duas barras largas não cabem. No telemóvel é um seletor, com Anterior e
 * Seguinte: uma fila de separadores obrigaria a arrastar de lado para descobrir que há mais.
 */

/** Fora da página em secções (a criação do pedido, por exemplo) não há secção nenhuma: `null`, e o
 * formulário mostra tudo. Até 01/11/2026 o valor por omissão era «resumo», uma secção sem campos —
 * a página «Novo pedido» ficou um botão sozinho, e carregar nele não fazia nada visível porque o erro
 * caía num campo escondido (relatado pelo promotor). */
const SeccaoActiva = createContext<SeccaoId | null>(null);
const IrParaSeccao = createContext<(s: SeccaoId) => void>(() => {});

/** Para que o formulário dos dados saiba que grupo de campos há-de mostrar. */
export const useSeccaoActiva = () => useContext(SeccaoActiva);

/** Para que a revisão possa mandar o cliente ao sítio onde se resolve cada coisa que falta. */
export const useIrParaSeccao = () => useContext(IrParaSeccao);

const PONTO: Record<EstadoDaSeccao, string> = {
  por_preencher: 'border border-slate-300 bg-white',
  em_preparacao: 'border-2 border-amber-700 bg-white',
  revisto: 'bg-tinta-600',
};

/**
 * Três passos em vez de seis secções numa coluna (promotor, 01/11/2026: «não quero colunas únicas
 * encostadas à esquerda; tudo num só ecrã, áreas separadas visualmente por função»). Cada passo
 * mostra os seus quadros lado a lado; as secções continuam a existir por baixo (os estados, os
 * bloqueios e o «Rever em…» da revisão apontam para elas), só mudou o que se vê de cada vez.
 */
export const PASSOS = [
  { id: 'essencial', nome: 'O essencial', seccoes: ['pretende', 'preferencias'] as const },
  { id: 'medidas', nome: 'Medidas e fotografias', seccoes: ['zonas', 'fotografias'] as const },
  { id: 'rever', nome: 'Rever e publicar', seccoes: ['resumo', 'publicar'] as const },
] as const;
type PassoId = (typeof PASSOS)[number]['id'];

/**
 * As classes de um bloco que se esconde sem se desmontar: visível, as suas; escondido, só `hidden`.
 * O atributo `hidden` sozinho não chega quando o bloco tem uma classe de `display` (`grid`, `flex`):
 * no Tailwind 3.4 essa classe vence a regra `[hidden]` do preflight e o bloco fica à vista.
 */
export const mostrarSo = (visivel: boolean, classes: string) => (visivel ? classes : 'hidden');

const passoDe = (s: SeccaoId): PassoId => PASSOS.find((p) => (p.seccoes as readonly SeccaoId[]).includes(s))!.id;

function estadoDoPasso(p: (typeof PASSOS)[number], estados: Record<SeccaoId, EstadoDaSeccao>): EstadoDaSeccao {
  const es = p.seccoes.map((s) => estados[s]);
  if (es.every((e) => e === 'revisto')) return 'revisto';
  if (es.every((e) => e === 'por_preencher')) return 'por_preencher';
  return 'em_preparacao';
}

export function PedidoEmSeccoes({
  estados,
  inicial = 'resumo',
  slots,
  formulario,
}: {
  estados: Record<SeccaoId, EstadoDaSeccao>;
  inicial?: SeccaoId;
  /** O conteúdo de cada secção que vem do servidor. */
  slots: Partial<Record<SeccaoId, ReactNode>>;
  /** O formulário dos dados do pedido, que vive em duas secções e por isso se renderiza à parte. */
  formulario: ReactNode;
}) {
  const [passo, setPasso] = useState<PassoId>(passoDe(inicial));
  const i = PASSOS.findIndex((p) => p.id === passo);
  const anterior = PASSOS[i - 1];
  const seguinte = PASSOS[i + 1];
  // O formulário lê a secção activa para saber se se mostra: no passo 1 é «pretende» (e mostra tudo).
  const seccaoActiva: SeccaoId = PASSOS[i]!.seccoes[0];

  return (
    <SeccaoActiva.Provider value={seccaoActiva}>
    <IrParaSeccao.Provider value={(s) => setPasso(passoDe(s))}>
      <div>
        {/* Os passos, no topo: número, nome e o ponto de estado. Em telemóvel só os números. */}
        <ol className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-4" aria-label="Passos do pedido">
          {PASSOS.map((p, n) => {
            const aqui = p.id === passo;
            const estado = estadoDoPasso(p, estados);
            return (
              <li key={p.id} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPasso(p.id)}
                  aria-current={aqui ? 'step' : undefined}
                  className={`inline-flex min-h-[44px] items-center gap-2 rounded-full border px-4 py-2 text-[15px] ${
                    aqui ? 'border-slate-200 bg-white font-semibold text-tinta-900' : 'border-transparent text-slate-600 hover:bg-white/60'
                  }`}
                >
                  <span
                    className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-[13px] font-semibold ${
                      aqui ? 'bg-tinta-900 text-white' : 'border border-slate-300 text-slate-500'
                    }`}
                  >
                    {n + 1}
                  </span>
                  <span className="hidden sm:inline">{p.nome}</span>
                  <span aria-hidden="true" className={`h-2.5 w-2.5 rounded-full ${PONTO[estado]}`} />
                  <span className="sr-only">— {ESTADO_DA_SECCAO_LABELS[estado]}</span>
                </button>
                {n < PASSOS.length - 1 && <span aria-hidden className="hidden h-px w-6 bg-slate-300 sm:block" />}
              </li>
            );
          })}
        </ol>

        <div className="mt-5">
          {/* Passo 1: o formulário em grelha de quadros (RequestForm trata da disposição). */}
          <div hidden={passo !== 'essencial'}>{formulario}</div>

          {/* Passo 2: zonas e medidas à esquerda, fotografias à direita. Esconder e não desmontar.
              A classe `grid` não pode ir com o atributo `hidden`: no Tailwind 3.4 a regra
              `[hidden] { display: none }` tem a mesma especificidade que `.grid` e vem antes, por isso
              perdia — o passo escondido aparecia por baixo dos outros (o «Resumo do pedido» e o
              «Publicar» no passo 2, relatado pelo promotor a 05/11/2026). Escondido, leva `hidden`
              também como classe (`mostrarSo`). */}
          <div hidden={passo !== 'medidas'} className={mostrarSo(passo === 'medidas', 'grid gap-6 lg:grid-cols-12')}>
            <Area nome="Zonas e medidas" estado={estados.zonas} className="lg:col-span-7" moldura>
              {slots.zonas}
            </Area>
            <Area nome="Fotografias" estado={estados.fotografias} className="lg:col-span-5" moldura>
              {slots.fotografias}
            </Area>
          </div>

          {/* Passo 3: o resumo do que os pintores vão ler e, ao lado, o que falta e o botão. */}
          <div hidden={passo !== 'rever'} className={mostrarSo(passo === 'rever', 'grid gap-6 lg:grid-cols-12')}>
            <Area nome="Resumo do pedido" estado={estados.resumo} className="lg:col-span-7" semEstado>
              {slots.resumo}
            </Area>
            <Area nome="Publicar" estado={estados.publicar} className="lg:col-span-5" moldura>
              {slots.publicar}
            </Area>
          </div>
        </div>

        {/* A barra de passagem fica no fim do conteúdo, e não colada ao fundo do ecrã: colada,
            tapa campos e disputa espaço com o teclado do telemóvel. */}
        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
          <button type="button" onClick={() => anterior && setPasso(anterior.id)} disabled={!anterior} className="btn-quiet disabled:invisible">
            ← {anterior?.nome ?? ''}
          </button>
          <button type="button" onClick={() => seguinte && setPasso(seguinte.id)} disabled={!seguinte} className="btn-quiet disabled:invisible">
            {seguinte?.nome ?? ''} →
          </button>
        </div>
      </div>
    </IrParaSeccao.Provider>
    </SeccaoActiva.Provider>
  );
}

/** Uma área de um passo: título e estado no topo, o conteúdo por baixo. Com `moldura`, é um
 * cartão (o conteúdo que recebe não traz o seu). Sem número de índice: a ordem é a posição. */
function Area({
  nome,
  estado,
  className,
  semEstado = false,
  moldura = false,
  children,
}: {
  nome: string;
  estado: EstadoDaSeccao;
  className?: string;
  semEstado?: boolean;
  moldura?: boolean;
  children: ReactNode;
}) {
  return (
    <section className={`min-w-0 ${moldura ? 'rounded-2xl border border-slate-200 bg-white p-5' : ''} ${className ?? ''}`}>
      <header className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-[17px] font-semibold text-tinta-900">{nome}</h2>
        {!semEstado && (
          <span className="flex items-center gap-2 text-[13px] text-slate-600">
            <span aria-hidden="true" className={`h-2.5 w-2.5 rounded-full ${PONTO[estado]}`} />
            {ESTADO_DA_SECCAO_LABELS[estado]}
          </span>
        )}
      </header>
      {children}
    </section>
  );
}

/**
 * Conteúdo que só aparece em certas secções — mas que **continua montado** nas outras.
 *
 * É para o formulário dos dados do pedido, que vive em duas secções e não pode ser desmontado ao
 * mudar de secção: desmontá-lo perdia o que estivesse escrito e por preencher. `hidden` esconde
 * sem destruir, e é essa a diferença toda.
 */
export function CaixaDaSeccao({
  seccoes,
  className,
  children,
}: {
  seccoes: readonly SeccaoId[];
  className?: string;
  children: ReactNode;
}) {
  const activa = useSeccaoActiva();
  const visivel = activa === null || seccoes.includes(activa);
  return (
    <div hidden={!visivel} className={mostrarSo(visivel, className ?? '')}>
      {children}
    </div>
  );
}
