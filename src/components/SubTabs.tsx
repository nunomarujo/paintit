'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export interface SubTab {
  href: string;
  label: string;
  count?: number;
}

/** Sub-separadores de uma secção. O primeiro é a página da secção: só fica ativo quando o caminho é exatamente esse. */
export function SubTabs({ tabs }: { tabs: SubTab[] }) {
  const path = usePathname();
  const base = tabs[0]?.href;
  const active = (href: string) => (href === base ? path === href : path === href || path.startsWith(`${href}/`));
  return (
    <nav aria-label="Separadores da secção" className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
      {tabs.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          aria-current={active(t.href) ? 'page' : undefined}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold ${active(t.href) ? 'bg-tinta-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
        >
          {t.label}
          {t.count ? <span className={`rounded-full px-1.5 text-[10px] ${active(t.href) ? 'bg-white text-tinta-700' : 'bg-tinta-600 text-white'}`}>{t.count}</span> : null}
        </Link>
      ))}
    </nav>
  );
}
