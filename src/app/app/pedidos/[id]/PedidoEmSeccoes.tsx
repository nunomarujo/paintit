'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';
import {
  ESTADO_DA_SECCAO_LABELS,
  SECCOES,
  type EstadoDaSeccao,
  type SeccaoId,
} from '@/domain/seccoes';

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

const SeccaoActiva = createContext<SeccaoId>('resumo');
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
  const [activa, setActiva] = useState<SeccaoId>(inicial);
  const i = SECCOES.findIndex((s) => s.id === activa);
  const anterior = SECCOES[i - 1];
  const seguinte = SECCOES[i + 1];

  return (
    <SeccaoActiva.Provider value={activa}>
    <IrParaSeccao.Provider value={setActiva}>
      <div className="lg:flex lg:items-start lg:gap-8">
        {/* Computador: a coluna da esquerda, estreita. */}
        <nav aria-label="Secções do pedido" className="hidden lg:block lg:w-56 lg:shrink-0">
          <ul className="space-y-1">
            {SECCOES.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => setActiva(s.id)}
                  aria-current={activa === s.id ? 'true' : undefined}
                  className={`flex min-h-[44px] w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[17px] ${
                    activa === s.id ? 'bg-tinta-50 font-semibold text-tinta-900' : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span aria-hidden="true" className={`h-2.5 w-2.5 shrink-0 rounded-full ${PONTO[estados[s.id]]}`} />
                  <span className="flex-1">{s.nome}</span>
                  <span className="sr-only">— {ESTADO_DA_SECCAO_LABELS[estados[s.id]]}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* Telemóvel: um seletor, e não uma fila de separadores a arrastar de lado. */}
        <div className="lg:hidden">
          <label htmlFor="seccao" className="text-[15px] font-medium text-slate-600">
            Secção
          </label>
          <select
            id="seccao"
            value={activa}
            onChange={(ev) => setActiva(ev.target.value as SeccaoId)}
            className="campo mt-1"
          >
            {SECCOES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nome} — {ESTADO_DA_SECCAO_LABELS[estados[s.id]]}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-5 min-w-0 flex-1 lg:mt-0">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h2 className="text-[26px] leading-tight font-semibold">{SECCOES[i]!.nome}</h2>
            {activa !== 'resumo' && (
              <p className="text-[15px] text-slate-500">{ESTADO_DA_SECCAO_LABELS[estados[activa]]}</p>
            )}
          </div>

          <div className="mt-4 space-y-5">
            {SECCOES.map((s) => (
              // `hidden` e não desmontar: é isto que faz com que mudar de secção não perca nada.
              <div key={s.id} hidden={activa !== s.id}>
                {slots[s.id]}
              </div>
            ))}
            {formulario}
          </div>

          {/* A barra de passagem fica no fim do conteúdo, e não colada ao fundo do ecrã: colada,
              tapa campos e disputa espaço com o teclado do telemóvel. */}
          <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
            <button
              type="button"
              onClick={() => anterior && setActiva(anterior.id)}
              disabled={!anterior}
              className="btn-quiet disabled:invisible"
            >
              ← {anterior?.nome ?? ''}
            </button>
            <button
              type="button"
              onClick={() => seguinte && setActiva(seguinte.id)}
              disabled={!seguinte}
              className="btn-quiet disabled:invisible"
            >
              {seguinte?.nome ?? ''} →
            </button>
          </div>
        </div>
      </div>
    </IrParaSeccao.Provider>
    </SeccaoActiva.Provider>
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
  return (
    <div hidden={!seccoes.includes(activa)} className={className}>
      {children}
    </div>
  );
}
