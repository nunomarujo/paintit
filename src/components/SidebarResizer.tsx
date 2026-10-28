'use client';

import { useCallback, useEffect, useRef } from 'react';

const MIN = 180;
const MAX = 420;
// Nunca menos do que isto para o conteúdo principal, por muito que se arraste a barra — era isto
// que faltava (pedido do promotor, 27/10/2026, depois de a arrastar numa janela estreita e o
// conteúdo ficar espremido a ponto de parecer sobreposto ao da barra lateral).
const MIN_CONTENT = 360;
const CSS_VAR = '--sidebar-w';
const STORAGE_KEY = 'qp_sidebar_w';

/** A largura máxima de hoje, condicionada à janela de hoje: nunca deixa o conteúdo principal com
 * menos de `MIN_CONTENT` pixels, seja o valor guardado de uma janela maior ou o arrasto de agora. */
const maxFor = () => Math.max(MIN, Math.min(MAX, window.innerWidth - MIN_CONTENT));

/**
 * Arrastar a borda direita da barra lateral para ajustar a sua largura, em ecrã largo (pedido do
 * promotor, 26/10/2026) — fica entre {MIN} pixels e o que a janela actual permitir (até {MAX}),
 * sempre a deixar pelo menos {MIN_CONTENT}px ao conteúdo principal. A largura escolhida guarda-se
 * no `localStorage` deste navegador (conveniência do aparelho, não dados a sincronizar entre
 * contas nem entre dispositivos) e volta a aplicar-se da próxima vez que a página abrir — mas
 * sempre reconferida contra a janela de agora, nunca às cegas: um valor guardado num ecrã maior
 * não pode voltar a espremer o conteúdo numa janela mais pequena.
 *
 * Só mexe na variável CSS `--sidebar-w` diretamente no `<html>`, sem passar pelo React a cada
 * pixel arrastado — `src/app/app/layout.tsx` lê-a em `grid-template-columns`
 * (`md:grid-cols-[var(--sidebar-w,300px)_minmax(0,1fr)]`), 300px é a omissão — a largura a que
 * nenhum rótulo da barra parte em duas linhas (medido a 28/10/2026).
 */
export function SidebarResizer() {
  const draggingRef = useRef(false);

  useEffect(() => {
    const apply = () => {
      let saved: number | null = null;
      try {
        saved = Number(localStorage.getItem(STORAGE_KEY));
      } catch {
        // Privado, bloqueado, ou qualquer outra razão: fica na largura de sempre.
      }
      if (!saved || saved < MIN) return;
      document.documentElement.style.setProperty(CSS_VAR, `${Math.min(saved, maxFor())}px`);
    };
    apply();
    // A janela pode ficar mais estreita depois de aberta (redimensionar, rodar o ecrã): reconfere
    // sempre, não só à entrada.
    window.addEventListener('resize', apply);
    return () => window.removeEventListener('resize', apply);
  }, []);

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    draggingRef.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    // Enquanto se arrasta, o cursor fica "col-resize" mesmo que o rato passe por cima de texto
    // ou de outro elemento, e nada se selecciona por engano a meio do arrasto.
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    // A barra começa sempre encostada à esquerda do ecrã: a posição X do rato é já a largura.
    const w = Math.min(maxFor(), Math.max(MIN, Math.round(e.clientX)));
    document.documentElement.style.setProperty(CSS_VAR, `${w}px`);
  }, []);

  const endDrag = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    const w = getComputedStyle(document.documentElement).getPropertyValue(CSS_VAR).trim();
    const parsed = parseInt(w, 10);
    if (parsed) {
      try {
        localStorage.setItem(STORAGE_KEY, String(parsed));
      } catch {
        // Sem guardar não é grave: a barra fica na largura escolhida até à próxima visita.
      }
    }
    e.currentTarget.releasePointerCapture(e.pointerId);
  }, []);

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="Ajustar a largura da barra lateral"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      // `right-0`, não `-right-[3px]`: a barra lateral ganhou `overflow-hidden` (layout.tsx,
      // 27/10/2026) para nenhum texto transbordar para cima do conteúdo, e isso cortava metade
      // desta pega, que antes espreitava 3px para fora da caixa. Fica toda cá dentro.
      className="absolute inset-y-0 right-0 z-10 hidden w-1.5 cursor-col-resize touch-none select-none md:block hover:bg-marca-orange-deep/40 active:bg-marca-orange-deep/60"
    />
  );
}
