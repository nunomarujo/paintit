'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { DURACAO_DA_ROTACAO, peloCaminhoMaisCurto, rodarUmPasso, suavizar } from '@/domain/rotacao';

/**
 * O ângulo a que o desenho do passo 2 está a ser visto, e como muda (06/11/2026): arrastando (`definir`, a
 * cada movimento), pelos botões (`rodar`, `voltar`) e pelo «Ver no desenho» de uma zona oculta (`ir`).
 *
 * As mudanças por botão animam-se — uns 320 ms, pelo caminho mais curto —, **a não ser que o sistema peça
 * menos movimento** (`prefers-reduced-motion`): então o desenho salta para o ângulo pedido. Arrastar nunca
 * anima; interromper uma animação com um arrasto ou outro botão pára-a onde está.
 */

/** O sistema pede menos movimento? Falso no servidor e antes de montar: sem preferência conhecida, anima-se. */
export function useMovimentoReduzido(): boolean {
  const [reduzido, setReduzido] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const m = window.matchMedia('(prefers-reduced-motion: reduce)');
    const ler = () => setReduzido(m.matches);
    ler();
    m.addEventListener('change', ler);
    return () => m.removeEventListener('change', ler);
  }, []);
  return reduzido;
}

export interface RotacaoDoDesenho {
  /** O ângulo de agora (contínuo: não está normalizado). */
  angulo: number;
  /** Põe o ângulo já, sem animar: o arrasto. */
  definir: (angulo: number) => void;
  /** Roda até ao ângulo, pelo caminho mais curto (animado, salvo movimento reduzido). */
  ir: (angulo: number) => void;
  /** Uma paragem para o lado indicado. */
  rodar: (sentido: 'esquerda' | 'direita') => void;
  /** A vista inicial. */
  voltar: () => void;
  /** Está a animar? */
  aAnimar: boolean;
}

export function useAnguloDoDesenho(inicial: number): RotacaoDoDesenho {
  const [angulo, setAngulo] = useState(inicial);
  const [aAnimar, setAAnimar] = useState(false);
  const atual = useRef(inicial);
  // Para onde o desenho vai: o ângulo final da animação em curso, ou o atual. Os botões contam os passos a partir
  // daqui, e não do ângulo a meio do caminho — duas pancadas seguidas no botão são dois passos, e não um e meio.
  const alvo = useRef(inicial);
  const quadro = useRef(0);
  const reduzido = useMovimentoReduzido();

  const parar = useCallback(() => {
    if (quadro.current) cancelAnimationFrame(quadro.current);
    quadro.current = 0;
    setAAnimar(false);
  }, []);
  useEffect(() => parar, [parar]);

  const definir = useCallback(
    (a: number) => {
      parar();
      atual.current = a;
      alvo.current = a;
      setAngulo(a);
    },
    [parar],
  );

  const ir = useCallback(
    (destino: number) => {
      parar();
      const de = atual.current;
      // O caminho mais curto a partir do destino anterior (se ainda a animar), para a volta ser contínua.
      const para = peloCaminhoMaisCurto(alvo.current, destino);
      alvo.current = para;
      if (reduzido || typeof requestAnimationFrame === 'undefined' || Math.abs(para - de) < 0.01) {
        atual.current = para;
        setAngulo(para);
        return;
      }
      setAAnimar(true);
      const inicio = performance.now();
      const passo = (agora: number) => {
        const t = Math.min(1, (agora - inicio) / DURACAO_DA_ROTACAO);
        const a = de + (para - de) * suavizar(t);
        atual.current = a;
        setAngulo(a);
        if (t < 1) quadro.current = requestAnimationFrame(passo);
        else {
          quadro.current = 0;
          setAAnimar(false);
        }
      };
      quadro.current = requestAnimationFrame(passo);
    },
    [parar, reduzido],
  );

  const rodar = useCallback((sentido: 'esquerda' | 'direita') => ir(rodarUmPasso(alvo.current, sentido, inicial)), [ir, inicial]);
  const voltar = useCallback(() => ir(inicial), [ir, inicial]);

  return { angulo, definir, ir, rodar, voltar, aAnimar };
}
