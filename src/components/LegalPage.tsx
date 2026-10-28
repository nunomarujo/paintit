import Link from 'next/link';
import type { ReactNode } from 'react';
import { BrandMark } from '@/components/BrandMark';
import { BRAND } from '@/config/brand';

export const LEGAL_VERSION = '21 de outubro de 2026';

/** Ligações legais, para o rodapé e para o fim de cada página legal. */
export function LegalLinks({ className = '' }: { className?: string }) {
  return (
    <nav aria-label="Informação legal" className={`flex flex-wrap gap-x-5 ${className}`}>
      {[
        ['/termos', 'Termos e condições'],
        ['/privacidade', 'Privacidade e cookies'],
        ['/transparencia', 'Transparência'],
        ['/aviso-legal', 'Aviso legal'],
        ['/livro-de-reclamacoes', 'Livro de Reclamações'],
      ].map(([href, label]) => (
        // 44px de alvo: estas ligações tinham 20px de altura e são, em várias páginas, a única
        // navegação que existe (28/10/2026).
        <Link key={href} href={href!} className="inline-flex min-h-[44px] items-center hover:underline">
          {label}
        </Link>
      ))}
    </nav>
  );
}

/**
 * Cabeçalho das páginas públicas que não são a inicial.
 *
 * Antes não havia nenhum: as páginas legais, a Transparência e o artigo de obra pública traziam
 * só um "← Quem Pinta" de 20px num canto, e o artigo tem 6700px de altura a 390px — oito ecrãs
 * de telemóvel sem forma de voltar atrás sem subir tudo. A casca passa a ser a mesma da página
 * inicial, fixa no topo (28/10/2026).
 */
export function PublicHeader() {
  return (
    <header className="sticky top-0 z-20 h-14 border-b border-slate-200/80 bg-white/95 backdrop-blur print:hidden">
      <div className="mx-auto flex h-full max-w-3xl items-center justify-between px-4">
        <Link href="/" aria-label={`Ir para a página inicial de ${BRAND.name}`} className="inline-flex min-h-[44px] items-center">
          <BrandMark size="sm" />
        </Link>
        <Link href="/entrar" className="inline-flex min-h-[44px] items-center font-semibold text-tinta-700 underline-offset-4 hover:underline">
          Entrar
        </Link>
      </div>
    </header>
  );
}

export function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <>
      <PublicHeader />
      <main className="mx-auto max-w-3xl space-y-6 px-4 py-6 text-[17px] leading-relaxed">
        <h1 className="text-[26px] leading-tight font-semibold">{title}</h1>
        {children}
        <hr className="border-slate-200" />
        <LegalLinks className="text-slate-600" />
        {/*
          A nota de versão provisória estava logo abaixo do título. Um administrador de condomínio
          que esteja a avaliar se confia a obra do prédio a esta plataforma lia, como segunda frase
          da página legal, que a página legal ainda não tinha sido vista por um advogado. Continua
          a ser dita — é verdade e é prudente — mas no fim, ao pé das outras ligações legais.
        */}
        <p className="text-[15px] text-slate-500">
          Versão de {LEGAL_VERSION}, em fase de teste com um grupo restrito de utilizadores. Será revista por advogado
          antes do lançamento público.
        </p>
      </main>
    </>
  );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="text-[20px] leading-snug font-semibold">{title}</h2>
      <div className="mt-2 space-y-2">{children}</div>
    </section>
  );
}
