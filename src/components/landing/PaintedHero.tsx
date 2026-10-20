'use client';

import { useEffect, useRef, type ReactNode } from 'react';

// Prédio em desenho de linha que é colorido por uma "queda de tinta" ao descer a página.
// A cor vive numa segunda camada do mesmo desenho, revelada por uma máscara que desce com o scroll.

const W = 360;
const H = 480;
const COLS = [0, 1, 2];
const ROWS = [0, 1, 2, 3, 4];
const DRIPS = [
  { x: 14, e: 46 },
  { x: 62, e: 28 },
  { x: 108, e: 58 },
  { x: 156, e: 34 },
  { x: 204, e: 52 },
  { x: 252, e: 30 },
  { x: 300, e: 56 },
  { x: 340, e: 26 },
];
const INK = '#24424a';

function Building({ colored }: { colored: boolean }) {
  const f = (color: string) => (colored ? color : '#ffffff');
  return (
    <g stroke={INK} strokeWidth={1.6} strokeLinejoin="round" strokeLinecap="round">
      <rect x="60" y="64" width="240" height="386" fill={f('#f1e4cc')} />
      <rect x="148" y="64" width="64" height="386" fill={f('#dcc7a8')} />
      <rect x="52" y="46" width="256" height="18" fill={f('#c4572f')} />
      {ROWS.map((r) =>
        COLS.map((c) => {
          const x = 78 + c * 76;
          const y = 84 + r * 72;
          if (r === 4 && c === 1) {
            return <rect key={`${r}${c}`} x={x} y={y - 4} width="44" height="70" fill={f('#3c6e63')} />;
          }
          return (
            <g key={`${r}${c}`}>
              <rect x={x} y={y} width="44" height="46" fill={f('#9bbdd3')} />
              <path d={`M${x + 22} ${y}v46M${x} ${y + 23}h44`} fill="none" strokeWidth={1} />
              {r < 4 && <rect x={x - 6} y={y + 46} width="56" height="6" fill={f('#2f4b50')} />}
            </g>
          );
        }),
      )}
      <rect x="40" y="450" width="280" height="8" fill={f('#cfd9c6')} />
    </g>
  );
}

export function PaintedHero({ children }: { children: ReactNode }) {
  const wrap = useRef<HTMLElement>(null);
  const main = useRef<SVGRectElement>(null);
  const drips = useRef<(SVGRectElement | null)[]>([]);

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const paint = (p: number) => {
      const y = p * (H + 70);
      main.current?.setAttribute('height', String(y));
      DRIPS.forEach((d, i) => {
        const len = d.e * Math.min(1, p * 8) * (1 - p) ** 0.4;
        drips.current[i]?.setAttribute('height', String(Math.max(0, len + 6)));
        drips.current[i]?.setAttribute('y', String(y - 6));
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
    <section ref={wrap} className="relative h-[210vh]">
      <div className="sticky top-14 mx-auto grid h-[calc(100vh-3.5rem)] max-w-6xl content-center gap-6 px-4 lg:grid-cols-2 lg:items-center">
        <div>{children}</div>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="mx-auto max-h-[44vh] w-full lg:max-h-[78vh]"
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
                  x={d.x - 12}
                  y="0"
                  width="24"
                  height="0"
                  rx="12"
                  fill="#fff"
                />
              ))}
            </mask>
          </defs>
          <Building colored={false} />
          <g mask="url(#queda-de-tinta)">
            <Building colored />
          </g>
        </svg>
      </div>
    </section>
  );
}
