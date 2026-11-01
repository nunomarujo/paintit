'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useId, useRef, useState, type RefObject } from 'react';


import { CONTEUDO_DE_PERFIL, DEMO_DE_PERFIL, toOrg, type Tipo } from '@/components/landing/perfis';

/**
 * Conteúdo dos dois popups "Para quem", pela ordem decidida na v4: introdução → 3 vantagens
 * resumidas → demonstração visual → "Tudo o que inclui" (lista completa) → nota de condições
 * comerciais (sem percentagens — regra 15 do CLAUDE.md) → CTA de adesão.
 *
 * Demonstração visual (reintroduzida a 31/10/2026, pedido do promotor): capturas reais, com dados
 * fictícios, dos mesmos componentes do produto — nunca uma interface inventada. Cada imagem vem de
 * uma rota de demonstração isolada, fora do fluxo normal da aplicação, sem autenticação e sem
 * qualquer leitura da base real (mesmo padrão de `src/app/demo-comparador`):
 * - pintor: `src/app/demo-orcamento` — o `WorksEditor` real do orçamento guiado
 *   (`src/app/app/oportunidades/[id]/orcamento/WorksEditor.tsx`), com a caixa de sugestões do
 *   catálogo aberta.
 * - fornecedor: `src/app/demo-catalogo` — o `ProductCard` real do catálogo
 *   (`src/components/ProductCard.tsx`) e a lista de descontos do ecrã real do fornecedor
 *   (`src/app/app/organizacoes/[id]/produtos/page.tsx`).
 * As capturas foram tiradas com Playwright a partir dessas rotas e guardadas em
 * `public/img/popup-demo-*.webp`; não existe ligação ao vivo entre o popup e essas rotas.
 */


export function AudiencePopup({ tipo, open, onClose }: { tipo: Tipo; open: boolean; onClose: () => void }) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<Element | null>(null);
  const titleId = useId();
  const demoTitleId = useId();
  const c = CONTEUDO_DE_PERFIL[tipo];
  const demo = DEMO_DE_PERFIL[tipo];

  // Ampliar a demonstração abre um segundo "diálogo", por cima deste. Um Escape fecha primeiro a
  // ampliação (ref, não estado, para o efeito abaixo não ter de voltar a subscrever o 'keydown' a
  // cada abrir/fechar) — só um segundo Escape fecha o popup inteiro.
  const [lightbox, setLightbox] = useState(false);
  const lightboxRef = useRef(false);
  lightboxRef.current = lightbox;
  const thumbRef = useRef<HTMLButtonElement>(null);
  const closeLightboxRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    openerRef.current = document.activeElement;
    const dialog = dialogRef.current;
    const focusable = () =>
      dialog
        ? Array.from(
            dialog.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'),
          ).filter((el) => el.offsetParent !== null)
        : [];
    focusable()[0]?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (lightboxRef.current) {
          e.stopPropagation();
          setLightbox(false);
          return;
        }
        e.stopPropagation();
        onClose();
        return;
      }
      if (lightboxRef.current) return; // o Tab, enquanto a ampliação está aberta, fica só nela (ver o efeito dela).
      if (e.key === 'Tab') {
        const f = focusable();
        if (f.length === 0) return;
        const first = f[0]!;
        const last = f[f.length - 1]!;
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      if (openerRef.current instanceof HTMLElement) openerRef.current.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center" role="presentation">
      <div className="absolute inset-0 bg-[rgba(18,48,42,.55)] backdrop-blur-[2px]" onClick={onClose} />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-10 flex max-h-[94vh] w-full max-w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-[0_30px_70px_-20px_rgba(0,0,0,.45)] [&_*:focus]:outline [&_*:focus]:outline-[3px] [&_*:focus]:outline-offset-2 [&_*:focus]:outline-[#2d5bff] sm:max-h-[88vh] sm:max-w-[840px] sm:rounded-2xl"
      >
        <div className="flex items-start justify-between gap-4 px-6 pt-6 sm:px-[26px]">
          <div>
            <p className="text-[13px] font-bold uppercase tracking-[.04em] text-tinta-700">{c.tag}</p>
            <h2 id={titleId} className="mt-2 text-[26px] font-extrabold leading-tight text-tinta-900">
              {c.titulo}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="inline-flex h-11 w-11 flex-none items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
          >
            <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-8 pt-4 sm:px-[26px]">
          <p className="max-w-[62ch] text-[17px] text-slate-600">{c.intro}</p>

          <ul className="mt-4 grid gap-2.5 sm:grid-cols-3">
            {c.destaques.map((d) => (
              <li key={d} className="flex items-start gap-2 rounded-lg bg-tinta-50 px-3 py-2.5 text-[15px] font-semibold text-tinta-900">
                <span className="mt-1.5 h-[7px] w-[7px] flex-none rounded-full bg-terracota" />
                {d}
              </li>
            ))}
          </ul>

          <div className="mt-7">
            <button
              ref={thumbRef}
              type="button"
              onClick={() => setLightbox(true)}
              aria-describedby={demoTitleId}
              className="group block w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 text-left focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[#2d5bff]"
            >
              <Image
                src={demo.src}
                alt={demo.alt}
                width={demo.width}
                height={demo.height}
                className="max-h-[260px] w-full object-cover object-top transition group-hover:opacity-90"
                sizes="(min-width: 640px) 792px, 100vw"
              />
              <span
                id={demoTitleId}
                className="flex min-h-[44px] items-center justify-center gap-1.5 border-t border-slate-200 bg-white px-3 text-[13px] font-semibold text-tinta-700"
              >
                {demo.legenda} — ver maior
                <svg aria-hidden width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M8 3H3v5M16 3h5v5M3 16v5h5M21 16v5h-5" />
                </svg>
              </span>
            </button>
          </div>

          <p className="mt-7 text-[13px] font-bold uppercase tracking-[.04em] text-slate-500">Tudo o que inclui</p>
          <ul className="mt-3.5 grid gap-3.5 sm:grid-cols-2">
            {c.beneficios.map((b) => (
              <li key={b} className="flex items-start gap-2.5 rounded-lg bg-slate-50 px-3.5 py-3 text-[15px] text-slate-700">
                <span className="mt-1.5 h-[7px] w-[7px] flex-none rounded-full bg-tinta-700" />
                {b}
              </li>
            ))}
          </ul>

          <p className="mt-5 max-w-[70ch] rounded-lg bg-tinta-50 px-3 py-2.5 text-[13px] text-slate-500">{c.nota}</p>

          <div className="mt-7 flex flex-wrap items-center justify-between gap-3.5 border-t border-slate-200 pt-5">
            <p className="max-w-[40ch] text-[15px] text-slate-600">{c.ctaNota}</p>
            <Link href={toOrg(tipo)} className="btn-primary btn-lg">
              {c.ctaTexto}
            </Link>
          </div>
        </div>
      </div>

      {lightbox && (
        <LightboxAmpliado onClose={() => setLightbox(false)} closeRef={closeLightboxRef} thumbRef={thumbRef} src={demo.src} alt={demo.alt} width={demo.width} height={demo.height} />
      )}
    </div>
  );
}

/**
 * Ampliação da captura (dentro de AudiencePopup, nunca sozinha): um "diálogo" simples por cima do
 * popup — uma imagem e um botão de fechar, sem mais nada focável, por isso o Tab só precisa de
 * devolver sempre o foco a esse botão (não um "trap" entre vários elementos, como o popup à volta
 * precisa). O Escape já é tratado no `onKey` do AudiencePopup (ver ali): fecha primeiro isto.
 */
function LightboxAmpliado({
  onClose,
  closeRef,
  thumbRef,
  src,
  alt,
  width,
  height,
}: {
  onClose: () => void;
  closeRef: RefObject<HTMLButtonElement | null>;
  thumbRef: RefObject<HTMLButtonElement | null>;
  src: string;
  alt: string;
  width: number;
  height: number;
}) {
  useEffect(() => {
    closeRef.current?.focus();
    const voltarAoFechar = thumbRef.current;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        closeRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      voltarAoFechar?.focus();
    };
  }, [closeRef, thumbRef]);

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={alt}>
      <div className="absolute inset-0 bg-[rgba(10,26,23,.82)]" onClick={onClose} />
      <div className="relative flex max-h-full max-w-full flex-col items-center gap-4">
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="Fechar imagem ampliada"
          className="inline-flex h-11 w-11 flex-none items-center justify-center self-end rounded-full border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[#2d5bff]"
        >
          <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
        {/* eslint-disable-next-line @next/next/no-img-element -- ampliação ao tamanho real da captura; next/image otimizada já serviu a miniatura acima. */}
        <img src={src} alt={alt} width={width} height={height} className="max-h-[80vh] w-auto max-w-full rounded-2xl object-contain shadow-2xl" />
      </div>
    </div>
  );
}
