'use client';

import { useEffect, useRef, type ReactNode } from 'react';

/**
 * Entrada dos filhos de uma secção quando ela chega ao ecrã: título, texto, imagem, em escada de
 * 70 ms, 16 px a subir com opacidade. Uma vez só. Com `prefers-reduced-motion` o conteúdo aparece
 * sem deslocação (CSS em `globals.css`, `.revelar`). Sem script, os filhos estão sempre visíveis.
 */
export function Revelar({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.dataset.pronto = '';
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            el.dataset.visivel = '';
            io.disconnect();
          }
        }
      },
      { rootMargin: '0px 0px -10% 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className={`revelar ${className ?? ''}`}>
      {children}
    </div>
  );
}
