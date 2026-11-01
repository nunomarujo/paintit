'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { BrandMark } from '@/components/BrandMark';
import { Logotipo } from '@/components/Logotipo';

const START = '/entrar?seguinte=%2Fapp%2Fcomecar';

const NAV_LINKS: { href: string; label: string }[] = [
  { href: '#como-funciona', label: 'Como funciona' },
  { href: '#demo-comparador', label: 'Comparador' },
  { href: '/empresas', label: 'Empresas de pintura' },
  { href: '/fornecedores', label: 'Fornecedores' },
];

/**
 * Cabeçalho da página inicial: transparente no topo, pílula branca compacta a partir de 80px de
 * scroll (réplica da mecânica validada no protótipo isolado, `header.site`/`body.scrolled`).
 *
 * "Entrar" tem o seu próprio ponto de quebra (640px), independente do menu principal (900px):
 * em tablet o menu já está escondido mas "Entrar" continua à vista, fora do hambúrguer — só
 * desaparece do cabeçalho abaixo dos 640px, onde já está um toque dentro do menu móvel.
 */
/**
 * `sobreFoto`: a página abre com uma fotografia a toda a largura por baixo do cabeçalho (estilo
 * aprovado a 01/11/2026). Enquanto não há scroll o cabeçalho é transparente com texto branco e o
 * logótipo em versão escura; ao descer passa à barra branca de sempre. Sem o espaçador de altura,
 * porque a fotografia começa no topo da janela.
 */
export function SiteHeader({ sobreFoto = false }: { sobreFoto?: boolean } = {}) {
  const [scrolled, setScrolled] = useState(false);
  const claro = sobreFoto && !scrolled;
  const [mobileOpen, setMobileOpen] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        setScrolled(window.scrollY > 80);
      });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  useEffect(() => {
    const targets = NAV_LINKS.map((l) => document.getElementById(l.href.slice(1))).filter(
      (el): el is HTMLElement => el !== null,
    );
    if (!('IntersectionObserver' in window) || targets.length === 0) return;
    const io = new IntersectionObserver(
      (entries) => {
        let best: IntersectionObserverEntry | null = null;
        for (const e of entries) {
          if (e.isIntersecting && (!best || e.intersectionRatio > best.intersectionRatio)) best = e;
        }
        if (best) setActive(best.target.id);
      },
      { rootMargin: '-40% 0px -50% 0px', threshold: [0, 0.25, 0.5, 0.75, 1] },
    );
    targets.forEach((t) => io.observe(t));
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileOpen(false);
        toggleRef.current?.focus();
      }
    };
    const onClick = (e: MouseEvent) => {
      if (menuRef.current?.contains(e.target as Node) || toggleRef.current?.contains(e.target as Node)) return;
      setMobileOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('click', onClick);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('click', onClick);
    };
  }, [mobileOpen]);

  return (
    <>
      <header
        className={
          'fixed inset-x-0 top-0 z-50 flex h-[var(--altura-cabecalho)] items-center transition-[top] duration-250 ' +
          (scrolled ? 'sm:top-3' : 'top-0')
        }
      >
        <div
          className={
            'mx-auto flex h-full w-full items-center justify-between transition-all duration-250 ' +
            (scrolled
              ? 'max-w-6xl bg-white/95 px-4 py-0 sm:h-[58px]'
              : 'max-w-6xl bg-transparent px-4')
          }
        >
          <Link href="/" aria-label="Início" className="inline-flex min-h-[44px] items-center pl-2">
            {claro ? <Logotipo tamanho="sm" escuro /> : <BrandMark size="sm" />}
          </Link>

          <nav aria-label="Principal" className={`hidden items-center gap-7 text-[15px] font-semibold min-[900px]:flex ${claro ? 'text-white/85' : 'text-slate-700'}`}>
            {NAV_LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className={
                  'inline-flex min-h-[44px] items-center border-b-2 border-transparent ' +
                  (claro ? 'hover:text-white' : active === l.href.slice(1) ? 'border-tinta-600 text-tinta-900' : 'hover:text-tinta-700')
                }
              >
                {l.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-4">
            <Link
              href="/entrar"
              className={`btn-secondary hidden sm:inline-flex ${claro ? 'border-white/60 bg-transparent text-white hover:bg-white/10' : ''}`}
            >
              Entrar
            </Link>
            <Link href={START} className="btn-primary hidden min-[900px]:inline-flex">
              Pedir orçamentos
            </Link>
            <button
              ref={toggleRef}
              type="button"
              aria-expanded={mobileOpen}
              aria-controls="menu-movel"
              aria-label={mobileOpen ? 'Fechar menu' : 'Abrir menu'}
              onClick={() => setMobileOpen((o) => !o)}
              className={`inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg min-[900px]:hidden ${claro ? 'text-white hover:bg-white/10' : 'text-tinta-900 hover:bg-slate-100'}`}
            >
              <svg aria-hidden viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2">
                {mobileOpen ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M3 6h18M3 12h18M3 18h18" />}
              </svg>
            </button>
          </div>
        </div>
      </header>
      {!sobreFoto && <div className="h-[var(--altura-cabecalho)]" aria-hidden />}

      {mobileOpen && (
        <div
          id="menu-movel"
          ref={menuRef}
          aria-label="Menu móvel"
          className="fixed inset-x-3 top-[calc(var(--altura-cabecalho)+4px)] z-40 flex flex-col gap-0.5 rounded-2xl bg-white p-2.5 shadow-[0_14px_34px_-10px_rgba(23,63,66,.28)] min-[900px]:hidden"
        >
          {NAV_LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setMobileOpen(false)}
              className={
                'flex min-h-[44px] items-center rounded-lg px-3 font-semibold ' +
                (active === l.href.slice(1) ? 'bg-tinta-50 text-tinta-900' : 'text-slate-700 hover:bg-slate-100')
              }
            >
              {l.label}
            </a>
          ))}
          <Link
            href="/entrar"
            onClick={() => setMobileOpen(false)}
            className="flex min-h-[44px] items-center rounded-lg px-3 font-semibold text-slate-700 hover:bg-slate-100"
          >
            Entrar
          </Link>
        </div>
      )}
    </>
  );
}
