'use client';

import Link from 'next/link';
import { Fragment, type ComponentType, type SVGProps } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

export interface NavItem {
  href: string;
  label: string;
  /** Ícone do item (src/components/NavIcons.tsx) — lê-se a lista pela forma antes do texto. */
  icon?: ComponentType<SVGProps<SVGSVGElement>>;
  /** Contagem a mostrar (ex.: avisos por ler). */
  count?: number;
  /** Só fica ativo no endereço exato (ex.: o painel, que é o início de uma secção com subpáginas). */
  exact?: boolean;
  /**
   * Secções de dentro, mostradas por baixo quando se está lá.
   *
   * A aplicação já tem uma barra à esquerda: pôr outra coluna de separadores ao lado dela são duas
   * barras a competir pelo mesmo papel. O que é de dentro de uma secção vive aqui (25/10/2026).
   */
  children?: {
    href: string;
    label: string;
    aviso?: boolean;
    /**
     * O filho a assinalar quando nenhum dos outros bate — o que a secção mostra sem parâmetros.
     *
     * Sem isto, um filho cujo endereço não traz parâmetros fica activo em todas as vistas da secção
     * (nada para comparar é sempre verdade), e apareciam dois seleccionados ao mesmo tempo.
     */
    padrao?: boolean;
  }[];
}

/** Navegação da área de trabalho: lateral em ecrãs largos, em linha no telemóvel. */
export function AppNav({ groups }: { groups: { title: string; items: NavItem[] }[] }) {
  const path = usePathname();
  const params = useSearchParams();
  const dentro = (href: string) => path === href || path.startsWith(`${href}/`);
  // Um item fica activo pelo seu próprio endereço ou pelo de qualquer filho: "Ganhar obra" vive em
  // /app/oportunidades mas tem filhos em /app/obras-publicas, e sem isto o grupo fechava-se ao
  // entrar num deles (26/10/2026).
  const active = (i: NavItem) =>
    i.href === '/app' || i.exact
      ? path === i.href
      : dentro(i.href) || (i.children ?? []).some((c) => dentro(c.href.split('?')[0]!));
  // Um filho fica activo quando o endereço bate e todos os parâmetros dele também: é assim que
  // "?ver=feitos&grupo=enviados" se distingue de "?ver=novo" sem páginas novas.
  const activeChild = (href: string) => {
    const [caminho, consulta] = href.split('?');
    if (path !== caminho) return false;
    const pedidos = new URLSearchParams(consulta ?? '');
    return [...pedidos].every(([k, v]) => params.get(k) === v);
  };
  return (
    <nav aria-label="Navegação principal" className="flex gap-1 overflow-x-auto md:block md:space-y-6 md:overflow-visible">
      {groups.map((g) => (
        <div key={g.title} className="flex gap-1 md:block md:space-y-0.5">
          <p className="eyebrow hidden px-3 pb-2 text-marca-muted md:block">{g.title}</p>
          {g.items.map((i) => {
            const aberto = active(i) && !!i.children?.length;
            // Os filhos saem logo a seguir ao item a que pertencem. Estiveram a ser desenhados
            // depois da lista toda do grupo, o que os punha debaixo do último item — "Hoje, Equipa,
            // Contas" apareciam sob "Referências de fornecedores" (26/10/2026).
            const algumBate = aberto && i.children!.some((c) => !c.padrao && activeChild(c.href));
            const activo = (c: { href: string; padrao?: boolean }) =>
              c.padrao ? !algumBate && activeChild(c.href) : activeChild(c.href);
            const Icon = i.icon;
            return (
              <Fragment key={i.href}>
                <Link
                  href={i.href}
                  aria-current={active(i) ? 'page' : undefined}
                  className={`flex shrink-0 items-center justify-between gap-2 whitespace-nowrap rounded-[9px] px-3 py-2 text-[15px] ${
                    active(i)
                      ? 'bg-marca-cream font-semibold text-marca-ink'
                      : 'text-marca-muted hover:bg-marca-cream/60 hover:text-marca-ink'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    {Icon && <Icon className={`h-[18px] w-[18px] shrink-0 ${active(i) ? 'text-marca-orange-deep' : 'text-marca-muted/80'}`} />}
                    {i.label}
                  </span>
                  {i.count ? <span className="rounded-full bg-marca-orange-deep px-1.5 py-0.5 text-[15px] font-semibold text-white">{i.count}</span> : null}
                </Link>
                {aberto && (
                  // A régua acompanha só os filhos deste item. No telemóvel não há régua, que a
                  // barra corre na horizontal.
                  <div className="flex gap-1 md:ml-3 md:block md:space-y-0.5 md:border-l md:border-marca-border">
                    {i.children!.map((c) => (
                      <Link
                        key={c.href}
                        href={c.href}
                        aria-current={activo(c) ? 'page' : undefined}
                        className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-[9px] px-3 py-1.5 text-[15px] md:pl-4 ${
                          activo(c) ? 'font-semibold text-marca-ink' : 'text-marca-muted hover:text-marca-ink'
                        }`}
                      >
                        {c.aviso && <span aria-hidden className="text-amber-700">⚠</span>}
                        {c.label}
                      </Link>
                    ))}
                  </div>
                )}
              </Fragment>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
