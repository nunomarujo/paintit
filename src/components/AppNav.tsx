'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export interface NavItem {
  href: string;
  label: string;
  /** Contagem a mostrar (ex.: avisos por ler). */
  count?: number;
  /** Só fica ativo no endereço exato (ex.: o painel, que é o início de uma secção com subpáginas). */
  exact?: boolean;
}

/** Navegação da área de trabalho: lateral em ecrãs largos, em linha no telemóvel. */
export function AppNav({ groups }: { groups: { title: string; items: NavItem[] }[] }) {
  const path = usePathname();
  const active = (i: NavItem) => (i.href === '/app' || i.exact ? path === i.href : path === i.href || path.startsWith(`${i.href}/`));
  return (
    <nav aria-label="Navegação principal" className="flex gap-1 overflow-x-auto md:block md:space-y-6 md:overflow-visible">
      {groups.map((g) => (
        <div key={g.title} className="flex gap-1 md:block md:space-y-0.5">
          <p className="eyebrow hidden px-3 pb-2 md:block">{g.title}</p>
          {g.items.map((i) => (
            <Link
              key={i.href}
              href={i.href}
              aria-current={active(i) ? 'page' : undefined}
              className={`flex shrink-0 items-center justify-between gap-2 whitespace-nowrap rounded-[9px] px-3 py-2 text-[13px] ${
                active(i) ? 'bg-sage font-semibold text-tinta-600' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              {i.label}
              {i.count ? <span className="rounded-full bg-tinta-600 px-1.5 text-[10px] font-semibold text-white">{i.count}</span> : null}
            </Link>
          ))}
        </div>
      ))}
    </nav>
  );
}
