'use client';

import { useEffect, useRef, type ReactNode } from 'react';

/**
 * Uma janela por cima do passo: o `<dialog>` nativo, como em `PhotoInstructions` e em `Confirmar`.
 * O navegador dá o que interessa a quem usa teclado ou leitor de ecrã — o foco preso lá dentro, o
 * Escape a fechar, o resto da página inerte — e a camada de topo não depende dos antepassados (um
 * `transform` num contentor não a encolhe).
 *
 * Três formas: **gaveta** (à direita, a toda a altura: editar uma zona com o desenho à vista),
 * **grande** (quase o ecrã todo: a ferramenta de levantamento) e **centro** (uma fotografia). No
 * telemóvel, a gaveta e a grande ocupam o ecrã inteiro.
 *
 * Ao fechar, o foco volta a quem a abriu: sem isso, quem usa teclado ficava no topo da página.
 */
const FORMAS = {
  gaveta:
    'm-0 ml-auto h-[100dvh] max-h-none w-full max-w-none p-0 sm:w-[30rem] sm:rounded-l-2xl backdrop:bg-tinta-900/20 open:flex open:flex-col',
  grande:
    'm-0 h-[100dvh] max-h-none w-full max-w-none p-0 sm:m-auto sm:h-[calc(100dvh-48px)] sm:w-[min(1200px,calc(100vw-48px))] sm:rounded-2xl backdrop:bg-tinta-900/45 open:flex open:flex-col',
  centro: 'w-[min(36rem,calc(100vw-32px))] max-h-[calc(100dvh-32px)] rounded-2xl p-0 backdrop:bg-tinta-900/45 open:flex open:flex-col',
} as const;

export function Janela({
  aberta,
  aoFechar,
  forma,
  idDoTitulo,
  children,
}: {
  aberta: boolean;
  /** Chamado quando a janela fecha, seja pelo botão, pelo Escape ou por quem a abriu. */
  aoFechar: () => void;
  forma: keyof typeof FORMAS;
  /** O id do título, que dá o nome à janela. */
  idDoTitulo: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const quemAbriu = useRef<HTMLElement | null>(null);
  const fechar = useRef(aoFechar);
  fechar.current = aoFechar;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (aberta && !el.open) {
      quemAbriu.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      el.showModal();
    } else if (!aberta && el.open) {
      el.close();
    }
  }, [aberta]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const aoFecharJanela = () => {
      fechar.current();
      // Devolver o foco depois de o React tirar a janela: no mesmo tique, o botão ainda está inerte.
      const alvo = quemAbriu.current;
      if (alvo && alvo.isConnected) setTimeout(() => alvo.focus(), 0);
    };
    el.addEventListener('close', aoFecharJanela);
    return () => el.removeEventListener('close', aoFecharJanela);
  }, []);

  // Se o componente sair do ecrã com a janela aberta, ela não fica pendurada na camada de topo.
  useEffect(() => {
    const el = ref.current;
    return () => {
      if (el?.open) el.close();
    };
  }, []);

  return (
    <dialog ref={ref} aria-labelledby={idDoTitulo} className={`overflow-hidden bg-white text-slate-900 ${FORMAS[forma]}`}>
      {aberta && children}
    </dialog>
  );
}

/** O × de fechar uma janela: 44 px de alvo, com o nome dito ao leitor de ecrã. */
export function BotaoFechar({ rotulo, aoCarregar }: { rotulo: string; aoCarregar: () => void }) {
  return (
    <button type="button" onClick={aoCarregar} aria-label={rotulo} className="btn-quiet h-11 w-11 shrink-0 px-0 text-slate-600">
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        aria-hidden="true"
      >
        <path d="M6 6l12 12M18 6L6 18" />
      </svg>
    </button>
  );
}
