import Link from 'next/link';
import type { ReactNode } from 'react';
import { BRAND } from '@/config/brand';

export const LEGAL_VERSION = '21 de outubro de 2026';

/** Ligações legais, para o rodapé e para o fim de cada página legal. */
export function LegalLinks({ className = '' }: { className?: string }) {
  return (
    <nav aria-label="Informação legal" className={`flex flex-wrap gap-x-5 gap-y-2 ${className}`}>
      <Link href="/termos" className="hover:underline">Termos e condições</Link>
      <Link href="/privacidade" className="hover:underline">Privacidade e cookies</Link>
      <Link href="/transparencia" className="hover:underline">Transparência</Link>
      <Link href="/aviso-legal" className="hover:underline">Aviso legal</Link>
      <Link href="/livro-de-reclamacoes" className="font-semibold hover:underline">Livro de Reclamações</Link>
    </nav>
  );
}

export function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-6 text-[17px] leading-relaxed">
      <Link href="/" className="text-slate-600 hover:underline">
        ← {BRAND.name}
      </Link>
      <div>
        <h1 className="text-[26px] leading-tight font-semibold">{title}</h1>
        <p className="mt-1 text-[15px] text-slate-500">
          Versão provisória de {LEGAL_VERSION}, em fase de teste com um grupo restrito de utilizadores. Será revista por advogado antes do lançamento público.
        </p>
      </div>
      {children}
      <hr className="border-slate-200" />
      <LegalLinks className="text-slate-600" />
    </main>
  );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="text-[20px] font-semibold">{title}</h2>
      <div className="mt-2 space-y-2">{children}</div>
    </section>
  );
}
