'use client';

import { useEffect, useRef, type ReactNode } from 'react';

// Prédio em desenho de linha que é colorido por uma "queda de tinta" ao descer a página.
// Duas imagens do mesmo enquadramento (a de linha foi extraída da colorida, por isso coincidem ao pixel):
// a cor é revelada por uma máscara que desce com o scroll, com gotas à frente.

// Camadas de tinta: cada uma é uma cópia do mesmo prédio noutra paleta, revelada pela sua
// própria máscara. A descida da página pinta uma camada a seguir à outra, por cima da anterior.

const W = 928;
const H = 1152;
const LAYERS = 3;
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
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

export function PaintedHero({ children }: { children: ReactNode }) {
  const wrap = useRef<HTMLElement>(null);
  const mains = useRef<(SVGRectElement | null)[]>([]);
  const drips = useRef<(SVGRectElement | null)[][]>(Array.from({ length: LAYERS }, () => []));

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const paint = (p: number) => {
      for (let k = 0; k < LAYERS; k++) {
        const pk = clamp01(p * LAYERS - k);
        const y = pk * (H + 160);
        mains.current[k]?.setAttribute('height', String(y));
        DRIPS.forEach((d, i) => {
          const len = d.e * (0.7 + 0.3 * ((i + k) % 3)) * Math.min(1, pk * 8) * (1 - pk) ** 0.4;
          const el = drips.current[k]?.[i];
          el?.setAttribute('height', String(Math.max(0, len + 14)));
          el?.setAttribute('y', String(y - 14));
        });
      }
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
    <section ref={wrap} className="relative h-[330vh]">
      <div className="sticky top-14 mx-auto grid h-[calc(100vh-3.5rem)] max-w-6xl content-center gap-6 px-4 lg:grid-cols-2 lg:items-center">
        <div>{children}</div>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="mx-auto max-h-[46vh] w-full lg:max-h-[80vh]"
          role="img"
          aria-label="Prédio que se colore com a descida da página"
        >
          <defs>
            {Array.from({ length: LAYERS }, (_, k) => (
              <mask key={k} id={`tinta-${k}`} maskUnits="userSpaceOnUse" x="0" y="0" width={W} height={H}>
                <rect
                  ref={(el) => {
                    mains.current[k] = el;
                  }}
                  x="0"
                  y="0"
                  width={W}
                  height="0"
                  fill="#fff"
                />
                {DRIPS.map((d, i) => (
                  <rect
                    key={d.x}
                    ref={(el) => {
                      drips.current[k]![i] = el;
                    }}
                    x={((d.x + k * 41) % (W - 20)) - DRIP_W / 2}
                    y="0"
                    width={DRIP_W}
                    height="0"
                    rx={DRIP_W / 2}
                    fill="#fff"
                  />
                ))}
              </mask>
            ))}
          </defs>
          <image href="/img/predio-linha.webp" width={W} height={H} />
          {Array.from({ length: LAYERS }, (_, k) => (
            <image key={k} href={`/img/predio-cor-${k + 1}.webp`} width={W} height={H} mask={`url(#tinta-${k})`} />
          ))}
        </svg>
      </div>
    </section>
  );
}
