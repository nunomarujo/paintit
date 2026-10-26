import Link from 'next/link';

/**
 * Separadores locais dentro de uma página (não é mais um nível na barra lateral — caderno de
 * desenho da interface, 26/10/2026, "Dois níveis chegam: Grupo + destino no menu"). Puros links:
 * o estado vive no endereço, como o resto da aplicação, e um link partilhado abre no separador certo.
 */
export function LocalTabs({ tabs }: { tabs: { href: string; label: string; active: boolean }[] }) {
  return (
    <div role="tablist" className="flex gap-6 overflow-x-auto border-b border-marca-border">
      {tabs.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          role="tab"
          aria-selected={t.active}
          className={`shrink-0 whitespace-nowrap border-b-[3px] py-3 text-[17px] font-bold ${
            t.active ? 'border-marca-ink text-marca-ink' : 'border-transparent text-marca-muted hover:text-marca-ink'
          }`}
        >
          {t.label}
        </Link>
      ))}
    </div>
  );
}
