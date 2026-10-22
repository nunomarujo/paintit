import type { ReactNode } from 'react';
import { SubTabs, type SubTab } from './SubTabs';

/** Cabeçalho comum das secções do backoffice: título, explicação curta e sub-separadores. */
export function BackofficeSection({ title, intro, tabs, children }: { title: string; intro?: string; tabs?: SubTab[]; children: ReactNode }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{title}</h1>
        {intro && <p className="mt-1 max-w-3xl text-sm text-slate-600">{intro}</p>}
      </div>
      {tabs && tabs.length > 1 && <SubTabs tabs={tabs} />}
      {children}
    </div>
  );
}
