'use client';

import Link from 'next/link';
import { Fragment } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { ICONES, type NomeDeIcone } from '@/components/NavIcons';

export interface NavItem {
  href: string;
  label: string;
  /**
   * Nome do ícone (src/components/NavIcons.tsx) — lê-se a lista pela forma antes do texto.
   *
   * O nome e não o componente: isto atravessa a fronteira servidor→cliente, e uma função não.
   */
  icon?: NomeDeIcone;
  /** Contagem a mostrar (ex.: avisos por ler). */
  count?: number;
  /** Aviso em texto âmbar junto à etiqueta (regra 13 do CLAUDE.md: nunca fundo de cor numa lista). */
  aviso?: boolean;
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

/**
 * Navegação da área de trabalho: lateral sempre aberta em ecrã largo, sem alterações. Em telemóvel
 * fica fechada por omissão dentro de `<details>`, a mostrar só o item onde se está — antes a lista
 * inteira corria numa só linha horizontal e era cortada a meio do ecrã, sem indicação nenhuma de que
 * havia mais (capturas do promotor, 26/10/2026). Um toque na linha abre a lista completa, agrupada
 * como no ecrã largo, com os itens de cada grupo a dar a volta (flex-wrap) em vez de scroll.
 *
 * `<details>` nativo e não `useState`, pela mesma razão de ConcelhosPicker.tsx ("sem JavaScript
 * nenhum" sempre que dá) — mas aqui não dá para também forçar sempre aberto em ecrã largo só com
 * `<details>` e CSS, de forma fiável entre browsers (o conteúdo fechado deixa de fazer parte da
 * árvore de acessibilidade, e isso não se contorna por fora com um `display` do autor). Por isso há
 * duas versões da mesma lista de grupos — uma dentro do `<details>` (só visível em telemóvel), outra
 * sempre visível (só em ecrã largo) — geradas pela mesma função, para não haver duas fontes da verdade.
 */
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

  const renderGroup = (g: { title: string; items: NavItem[] }) => (
    <div key={g.title}>
      <p className="eyebrow px-3 pb-2 text-marca-muted">{g.title}</p>
      <div className="flex flex-wrap gap-1 md:block md:space-y-0.5">
        {g.items.map((i) => {
          const aberto = active(i) && !!i.children?.length;
          // Os filhos saem logo a seguir ao item a que pertencem. Estiveram a ser desenhados
          // depois da lista toda do grupo, o que os punha debaixo do último item — "Hoje, Equipa,
          // Contas" apareciam sob "Referências de fornecedores" (26/10/2026).
          const algumBate = aberto && i.children!.some((c) => !c.padrao && activeChild(c.href));
          const activo = (c: { href: string; padrao?: boolean }) =>
            c.padrao ? !algumBate && activeChild(c.href) : activeChild(c.href);
          const Icon = i.icon ? ICONES[i.icon] : null;
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
                  {i.aviso && <span aria-hidden className="text-marca-attention">⚠</span>}
                </span>
                {i.count ? <span className="rounded-full bg-marca-orange-deep px-1.5 py-0.5 text-[15px] font-semibold text-white">{i.count}</span> : null}
              </Link>
              {aberto && (
                // A régua acompanha só os filhos deste item. No telemóvel a linha dos filhos fica
                // inteira (basis-full) para não se misturar nos itens-pílula do grupo, e dá a volta
                // (flex-wrap) tal como o resto — mesma razão da nota acima.
                <div className="flex w-full flex-wrap gap-1 md:ml-3 md:w-auto md:block md:space-y-0.5 md:border-l md:border-marca-border">
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
    </div>
  );

  const atual = groups.flatMap((g) => g.items).find(active);
  const IconeAtual = atual?.icon ? ICONES[atual.icon] : null;

  return (
    <nav aria-label="Navegação principal">
      <details className="md:hidden">
        <summary
          className="flex cursor-pointer select-none items-center justify-between gap-2 rounded-[9px] bg-marca-cream px-3 py-2 text-[15px] font-semibold text-marca-ink [&::-webkit-details-marker]:hidden"
        >
          <span className="flex items-center gap-2.5">
            {IconeAtual && <IconeAtual className="h-[18px] w-[18px] shrink-0 text-marca-orange-deep" />}
            {atual?.label ?? 'Navegação'}
          </span>
          <span aria-hidden>▾</span>
        </summary>
        <div className="mt-3 space-y-4">{groups.map(renderGroup)}</div>
      </details>
      <div className="hidden md:block md:space-y-6">{groups.map(renderGroup)}</div>
    </nav>
  );
}
