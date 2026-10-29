'use client';

import { useEffect, useRef, type ReactNode } from 'react';

// Prédio em desenho de linha que é colorido por uma "queda de tinta" ao descer a página.
// Duas imagens do mesmo enquadramento (a de linha foi extraída da colorida, por isso coincidem ao pixel):
// a cor é revelada por uma máscara que desce com o scroll, com gotas à frente.

const W = 928;
const H = 1152;
const DRIPS = [
  { x: 50, e: 120 },
  { x: 160, e: 70 },
  { x: 265, e: 150 },
  { x: 370, e: 90 },
  { x: 480, e: 135 },
  { x: 590, e: 80 },
  { x: 700, e: 145 },
  { x: 810, e: 75 },
  { x: 890, e: 110 },
];
const DRIP_W = 56;

export function PaintedHero({ children }: { children: ReactNode }) {
  const wrap = useRef<HTMLElement>(null);
  const main = useRef<SVGRectElement>(null);
  const drips = useRef<(SVGRectElement | null)[]>([]);

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const paint = (p: number) => {
      const y = p * (H + 160);
      main.current?.setAttribute('height', String(y));
      DRIPS.forEach((d, i) => {
        const len = d.e * Math.min(1, p * 8) * (1 - p) ** 0.4;
        drips.current[i]?.setAttribute('height', String(Math.max(0, len + 14)));
        drips.current[i]?.setAttribute('y', String(y - 14));
      });
    };
    if (reduce) {
      paint(1);
      return;
    }
    let raf = 0;
    const update = () => {
      raf = 0;
      const el = wrap.current;
      if (!el) return;
      const total = el.offsetHeight - window.innerHeight;
      const p = total > 0 ? Math.min(1, Math.max(0, -el.getBoundingClientRect().top / total)) : 0;
      paint(p);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <section ref={wrap} className="relative h-[165vh] lg:h-[210vh]">
      {/*
        No telemóvel o prédio vai ao cimo e o que há para ler fica por baixo dele (pedido do promotor,
        27/10/2026). Antes, o bloco colado ao ecrã centrava texto e imagem num espaço de um ecrã só: o
        texto transbordava e a ilustração — que é a ideia da página inteira — caía toda para baixo da
        dobra. Quem abria no telemóvel nunca via o prédio ganhar cor.

        `svh` e não `vh`: no telemóvel, `vh` conta com a barra de endereço retraída, e o último terço
        do primeiro ecrã ficava escondido por baixo dela.
      */}
      <div className="sticky top-[var(--altura-cabecalho)] mx-auto grid h-[calc(100svh-var(--altura-cabecalho))] max-w-6xl grid-rows-[auto_1fr] content-start gap-5 px-4 lg:grid-cols-2 lg:grid-rows-none lg:content-center lg:items-center lg:gap-6">
        {/* `self-start` e não `self-center`: o texto está na linha flexível da grelha, e centrado
            deixava uma faixa vazia de ~100px entre o prédio e o título — espaço que o promotor queria
            a ler, não em branco (medido a 390×844, 27/10/2026). Agora o texto encosta ao prédio e a
            folga toda cai no fim, antes do scroll. */}
        <div className="order-last self-start pb-2 lg:order-none lg:self-auto lg:pb-0">{children}</div>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="order-first mx-auto max-h-[48svh] w-full lg:order-none lg:max-h-[80vh]"
          role="img"
          aria-label="Prédio que se colore com a descida da página"
        >
          <defs>
            <mask id="queda-de-tinta" maskUnits="userSpaceOnUse" x="0" y="0" width={W} height={H}>
              <rect ref={main} x="0" y="0" width={W} height="0" fill="#fff" />
              {DRIPS.map((d, i) => (
                <rect
                  key={d.x}
                  ref={(el) => {
                    drips.current[i] = el;
                  }}
                  x={d.x - DRIP_W / 2}
                  y="0"
                  width={DRIP_W}
                  height="0"
                  rx={DRIP_W / 2}
                  fill="#fff"
                />
              ))}
            </mask>
          </defs>
          <image href="/img/predio-linha.webp" width={W} height={H} />
          <image href="/img/predio-cor.webp" width={W} height={H} mask="url(#queda-de-tinta)" />
        </svg>
      </div>
    </section>
  );
}
