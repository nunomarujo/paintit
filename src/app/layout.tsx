import type { Metadata } from 'next';
import { Manrope } from 'next/font/google';
import type { ReactNode } from 'react';
import { BRAND } from '@/config/brand';
import './globals.css';

/**
 * Manrope (01/11/2026): a fonte do estilo aprovado pelo promotor para o site público, a partir da
 * referência usenorte.com, e levada aos espaços autenticados para o produto ser um só. A variável
 * CSS mantém o nome antigo para não mexer no `tailwind.config.ts` nem nos ecrãs.
 */
const manrope = Manrope({ subsets: ['latin'], weight: ['400', '500', '600', '700', '800'], variable: '--font-inter', display: 'swap' });
export const metadata: Metadata = {
  title: `${BRAND.name} — empreitadas de pintura`,
  description:
    'Plataforma para condomínios e particulares pedirem, compararem e contratarem empreitadas de pintura com pintores verificados.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-PT" className={manrope.variable}>
      <body>{children}</body>
    </html>
  );
}
