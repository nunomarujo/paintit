'use client';

import Link from 'next/link';
import { useRef } from 'react';
import { type NavGroup, useAppNavGroups } from '@/components/AppNav';

/**
 * Navegação em telemóvel (26/10/2026, a pedido do promotor, depois de ver a app ao vivo): um botão
 * só, no canto superior direito, ao lado da marca — não a barra lateral inteira a abrir por baixo
 * do conteúdo. Ao tocar, mostra um menu (não ocupa a página toda); ao escolher um destino, navega e
 * fecha-se sozinho.
 *
 * `<details>` nativo faz de "aberto/fechado" (mesma filosofia de ConcelhosPicker.tsx: sem JavaScript
 * sempre que dá), com o painel `absolute` para flutuar sobre o conteúdo em vez de o empurrar — mas
 * fechar ao escolher um link precisa mesmo de um toque de JavaScript (o browser não fecha um
 * `<details>` sozinho num clique lá dentro), daí a `ref` e o `fecha()` em cada link e no botão "Sair".
 *
 * Reúne tudo o que em ecrã largo vive em dois sítios — a barra lateral (`AppNav.tsx`) e o rodapé
 * "Empresa e conta" — num só menu, para não haver vários pontos de acesso diferentes em telemóvel.
 */
export function MobileNavMenu({
  groups,
  meuPerfil,
  email,
  mostrarSubscricao,
  pintorId,
  leave,
}: {
  groups: NavGroup[];
  meuPerfil: { id: string; nome: string } | null;
  email: string;
  mostrarSubscricao: boolean;
  pintorId: string | undefined;
  leave: () => Promise<void>;
}) {
  const ref = useRef<HTMLDetailsElement>(null);
  const fecha = () => {
    if (ref.current) ref.current.open = false;
  };
  const { renderGroup } = useAppNavGroups(groups, fecha);

  return (
    <details ref={ref} className="relative md:hidden">
      <summary
        aria-label="Abrir navegação"
        className="flex h-11 w-11 cursor-pointer select-none items-center justify-center rounded-[9px] text-marca-ink hover:bg-marca-cream/60 [&::-webkit-details-marker]:hidden"
      >
        <svg aria-hidden viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </summary>
      {/* Fundo semitransparente a fechar ao toque fora do menu, sob o próprio painel (z menor). */}
      <div className="fixed inset-0 z-20" onClick={fecha} aria-hidden />
      <div className="absolute right-0 z-30 mt-2 max-h-[75vh] w-72 max-w-[calc(100vw-2rem)] overflow-y-auto rounded-xl border border-marca-border bg-white p-3 shadow-lg">
        <div className="space-y-4">{groups.map(renderGroup)}</div>
        <div className="mt-4 space-y-0.5 border-t border-marca-border pt-3 text-[15px]">
          {meuPerfil ? (
            <Link href={`/app/organizacoes/${meuPerfil.id}`} onClick={fecha} className="-mx-1 flex min-h-[44px] items-center rounded-[9px] px-1 py-1.5 hover:bg-marca-cream/60">
              <span className="block text-marca-muted">O meu Perfil</span>
              <span className="block truncate font-semibold text-marca-ink">{meuPerfil.nome}</span>
            </Link>
          ) : (
            <p className="truncate px-1 py-1 font-semibold text-marca-ink">{email}</p>
          )}
          {mostrarSubscricao && (
            <Link href="/app/subscricao" onClick={fecha} className="flex min-h-[44px] items-center rounded-[9px] px-1 py-1 text-marca-muted hover:text-marca-ink">
              Plano e subscrição
            </Link>
          )}
          {pintorId && (
            <Link href={`/app/organizacoes/${pintorId}/referencias`} onClick={fecha} className="flex min-h-[44px] items-center rounded-[9px] px-1 py-1 text-marca-muted hover:text-marca-ink">
              Referências de fornecedores
            </Link>
          )}
          {!meuPerfil && (
            <Link href="/app/perfil" onClick={fecha} className="flex min-h-[44px] items-center rounded-[9px] px-1 py-1 text-marca-muted hover:text-marca-ink">
              Perfil
            </Link>
          )}
          <form
            action={leave}
            onSubmit={fecha}
            className="mt-1 border-t border-marca-border pt-2"
          >
            <button type="submit" className="flex min-h-[44px] w-full items-center rounded-[9px] px-1 py-1 text-left text-[17px] font-semibold text-marca-orange-deep hover:underline">
              Sair
            </button>
          </form>
        </div>
      </div>
    </details>
  );
}
