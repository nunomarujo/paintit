'use client';

import { useEffect, useRef } from 'react';

const TAMANHO = 140;
const ZOOM = 4;

/**
 * Lupa: um recorte ampliado 4× da fotografia, centrado no ponto que se está a marcar, com mira.
 * Fica acima e à esquerda do dedo/cursor para nunca tapar o ponto (handoff de 03/11/2026, secção 4:
 * «lupa para ajustar cada ponto»).
 */
export function Lupa({
  fonte,
  ponto,
  cursorCss,
}: {
  /** Imagem ou canvas de trabalho — as coordenadas de `ponto` estão nos píxeis desta fonte. */
  fonte: CanvasImageSource;
  ponto: { x: number; y: number };
  cursorCss: { x: number; y: number };
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const ctx = ref.current?.getContext('2d');
    if (!ctx) return;
    const regiao = TAMANHO / ZOOM;
    ctx.fillStyle = '#f1f5f9';
    ctx.fillRect(0, 0, TAMANHO, TAMANHO);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(fonte, ponto.x - regiao / 2, ponto.y - regiao / 2, regiao, regiao, 0, 0, TAMANHO, TAMANHO);
    ctx.strokeStyle = 'rgba(220,38,38,0.9)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(TAMANHO / 2, 0);
    ctx.lineTo(TAMANHO / 2, TAMANHO);
    ctx.moveTo(0, TAMANHO / 2);
    ctx.lineTo(TAMANHO, TAMANHO / 2);
    ctx.stroke();
  }, [fonte, ponto.x, ponto.y]);

  return (
    <canvas
      ref={ref}
      width={TAMANHO}
      height={TAMANHO}
      className="pointer-events-none absolute rounded-full border-2 border-white"
      style={{ left: Math.max(0, cursorCss.x - TAMANHO - 16), top: Math.max(0, cursorCss.y - TAMANHO - 16) }}
    />
  );
}
