'use client';

import { useState } from 'react';
import type { ProductGuide as ProductGuideText } from '@/domain/productGuide';

const TABS = [
  { id: 'serve', label: 'Para que serve' },
  { id: 'aplicar', label: 'Como se aplica' },
  { id: 'sugestoes', label: 'Sugestões' },
] as const;
type TabId = (typeof TABS)[number]['id'];

// Pedido do Nuno (02/11/2026): "para que serve", "como se aplica" e "sugestões" em botões na ficha
// de cada produto. O texto vem de `src/domain/productGuide.ts` (gerado por tipo de produto, a partir
// dos campos reais da ficha) — este componente só mostra, num grupo de botões, o que foi pedido.
export function ProductGuide({ paraQueServe, comoAplicar, sugestoes }: ProductGuideText) {
  const [tab, setTab] = useState<TabId>('serve');
  const texto: Record<TabId, string> = { serve: paraQueServe, aplicar: comoAplicar, sugestoes };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
      <h2 className="font-semibold">Para que serve e como aplicar</h2>
      <div className="mt-3 flex flex-wrap gap-2" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`btn-sm ${tab === t.id ? 'btn-primary' : 'btn-quiet'}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <p className="mt-4 text-[17px] leading-relaxed whitespace-pre-line" role="tabpanel">
        {texto[tab]}
      </p>
    </section>
  );
}
