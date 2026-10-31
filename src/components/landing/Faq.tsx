'use client';

import { useId, useState } from 'react';

export interface FaqItem {
  q: string;
  a: string;
}

/**
 * Acordeão da FAQ (secção "Perguntas frequentes" da landing, antes do CTA final — pedido do
 * promotor, 31/10/2026: reintroduzir a FAQ a par de Transparência, sem repetir o que já lá está).
 *
 * Cada pergunta é o seu próprio botão com `aria-expanded`, a controlar um painel por
 * `aria-controls`/`id` — ao contrário do antigo `<details>` de "Antes de avançar" (v3 e antes), que
 * dependia só da semântica nativa. Várias perguntas podem ficar abertas ao mesmo tempo (como no
 * `<details>` antigo, onde cada uma era independente): não há razão de conteúdo para fechar uma ao
 * abrir outra, e isso evitava o pior de um acordeão "exclusivo" — perder o sítio ao abrir a pergunta
 * seguinte.
 */
export function Faq({ items }: { items: FaqItem[] }) {
  const idBase = useId();
  const [open, setOpen] = useState<Set<number>>(new Set());
  const toggle = (i: number) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

  return (
    <div className="divide-y divide-slate-200 border-y border-slate-200">
      {items.map((item, i) => {
        const isOpen = open.has(i);
        const panelId = `${idBase}-painel-${i}`;
        const buttonId = `${idBase}-pergunta-${i}`;
        return (
          <div key={item.q} className="py-1">
            <button
              type="button"
              id={buttonId}
              aria-expanded={isOpen}
              aria-controls={panelId}
              onClick={() => toggle(i)}
              className="flex min-h-[44px] w-full items-center justify-between gap-4 py-3 text-left font-semibold text-tinta-900"
            >
              {item.q}
              <span aria-hidden className={`text-[20px] leading-snug transition-transform ${isOpen ? 'rotate-45' : ''}`}>
                +
              </span>
            </button>
            <p
              id={panelId}
              role="region"
              aria-labelledby={buttonId}
              hidden={!isOpen}
              className="pb-4 text-[17px] text-slate-700"
            >
              {item.a}
            </p>
          </div>
        );
      })}
    </div>
  );
}
