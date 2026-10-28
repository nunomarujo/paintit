import Link from 'next/link';
import type { ReactNode } from 'react';
import { ICONES } from '@/components/NavIcons';

/**
 * Ligação de voltar ao ecrã anterior, no topo das páginas de detalhe.
 *
 * Existia em 30 ecrãs, escrita à mão, sempre igual: um `←` de texto seguido do nome do sítio de
 * onde se vem. Duas coisas mal (28/10/2026): a seta de texto não tem o traço do conjunto de ícones
 * nem acompanha quando ele muda, e a ligação tinha 20px de altura — metade do que um dedo acerta.
 */
export function Voltar({ href, children, className = '' }: { href: string; children: ReactNode; className?: string }) {
  const Seta = ICONES.voltar;
  return (
    <Link
      href={href}
      className={`inline-flex min-h-[44px] items-center gap-1.5 text-[17px] text-slate-600 hover:underline ${className}`}
    >
      <Seta className="h-4 w-4 shrink-0" />
      {children}
    </Link>
  );
}
