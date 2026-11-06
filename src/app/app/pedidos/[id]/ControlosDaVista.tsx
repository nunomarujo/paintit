'use client';

import type { RotacaoDoDesenho } from './useAnguloDoDesenho';

/**
 * Os botões para rodar o desenho do prédio (06/11/2026): «Rodar à esquerda», «Rodar à direita» e «Vista
 * inicial». Arrastar o próprio desenho também roda (`Prancheta.tsx`), mas arrastar não é para toda a gente:
 * estes servem ao teclado, a quem usa um leitor de ecrã e a quem não acerta num arrasto — todos com 44 px de
 * alvo (as classes `btn-*`) e com o nome por extenso para o leitor de ecrã.
 *
 * Os textos visíveis são curtos para caberem os três numa linha no telemóvel; o nome acessível é a frase
 * inteira e contém o texto visível.
 */

const Seta = ({ sentido }: { sentido: 'esquerda' | 'direita' }) => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {sentido === 'esquerda' ? <path d="M10 3 5 8l5 5" /> : <path d="M6 3l5 5-5 5" />}
  </svg>
);

export function ControlosDaVista({ rotacao, className = '' }: { rotacao: RotacaoDoDesenho; className?: string }) {
  return (
    <div role="group" aria-label="Rodar o desenho do prédio" className={`flex flex-wrap items-center gap-2 ${className}`}>
      <span aria-hidden="true" className="text-[15px] text-slate-600">
        Rodar
      </span>
      <button
        type="button"
        onClick={() => rotacao.rodar('esquerda')}
        aria-label="Rodar à esquerda"
        className="btn-secondary btn-sm gap-1.5"
      >
        <Seta sentido="esquerda" />
        Esquerda
      </button>
      <button type="button" onClick={() => rotacao.rodar('direita')} aria-label="Rodar à direita" className="btn-secondary btn-sm gap-1.5">
        Direita
        <Seta sentido="direita" />
      </button>
      <button type="button" onClick={rotacao.voltar} className="btn-quiet btn-sm">
        Vista inicial
      </button>
    </div>
  );
}
