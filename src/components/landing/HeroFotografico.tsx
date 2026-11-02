'use client';

import { useEffect, useState, type ReactNode } from 'react';

export type FotoDoHero = { src: string; alt: string };

/**
 * Primeiro ecrã do site público (estilo aprovado pelo promotor a 01/11/2026, a partir de
 * usenorte.com): fotografias a toda a largura que se sucedem em fundido, com o título e as ações
 * por cima, em branco, encostados ao fundo. O cabeçalho fica transparente sobre a fotografia
 * (`SiteHeader sobreFoto`).
 *
 * A troca é a cada 4,5 s, com um zoom lento em cada fotografia enquanto está à vista. Com
 * `prefers-reduced-motion` fica só a primeira. Sem script, vê-se a primeira fotografia.
 */
export function HeroFotografico({ fotos, children }: { fotos: FotoDoHero[]; children: ReactNode }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (fotos.length < 2 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const t = setInterval(() => setI((v) => (v + 1) % fotos.length), 4500);
    return () => clearInterval(t);
  }, [fotos.length]);

  return (
    <section className="relative flex hero-ecra items-end overflow-hidden bg-tinta-900 text-white">
      <div aria-hidden className="absolute inset-0">
        {fotos.map((f, k) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={f.src}
            src={f.src}
            alt=""
            width={1376}
            height={768}
            loading={k === 0 ? 'eager' : 'lazy'}
            fetchPriority={k === 0 ? 'high' : 'low'}
            className="absolute inset-0 h-full w-full object-cover"
            style={{
              opacity: k === i ? 1 : 0,
              transform: k === i ? 'scale(1)' : 'scale(1.04)',
              transitionProperty: 'opacity, transform',
              transitionDuration: k === i ? '1400ms, 9000ms' : '1400ms, 0ms',
              transitionTimingFunction: 'ease-out, linear',
            }}
          />
        ))}
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,.4)_0%,rgba(0,0,0,0)_35%,rgba(0,0,0,.74)_100%)]" />
      </div>
      <div className="relative z-[2] mx-auto w-full max-w-[120rem] px-5 sm:px-10 lg:px-14 pb-16 pt-32">{children}</div>
      {fotos.length > 1 && (
        <div className="absolute bottom-7 right-4 z-[3] flex gap-1.5 sm:right-6" aria-hidden>
          {fotos.map((f, k) => (
            <span key={f.src} className={`h-[3px] w-7 rounded-full transition-colors ${k === i ? 'bg-white' : 'bg-white/35'}`} />
          ))}
        </div>
      )}
      {/* Os textos alternativos ficam acessíveis fora do carrossel, numa frase só. */}
      <p className="sr-only">{fotos.map((f) => f.alt).join('. ')}.</p>
    </section>
  );
}
