'use client';

import { useEffect, useRef, type ReactNode } from 'react';

/**
 * Entrada dos filhos de uma secção quando ela chega ao ecrã: título, texto, imagem, em escada de
 * 70 ms, 16 px a subir com opacidade. Uma vez só. Com `prefers-reduced-motion` o conteúdo aparece
 * sem deslocação (CSS em `globals.css`, `.revelar`). Sem script, os filhos estão sempre visíveis.
 */
export function Revelar({ children, className, id, as: Tag = 'div' }: { children: ReactNode; className?: string; id?: string; as?: 'div' | 'section' }) {
  const ref = useRef<HTMLElement>(null);
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
    <Tag ref={ref as React.RefObject<HTMLDivElement>} id={id} className={`revelar ${className ?? ''}`}>
      {children}
    </Tag>
  );
}
