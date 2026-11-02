import type { Metadata } from 'next';
import localFont from 'next/font/local';
import type { ReactNode } from 'react';
import { BRAND } from '@/config/brand';
import './globals.css';

/**
 * Manrope (01/11/2026): a fonte do estilo aprovado pelo promotor para o site público, a partir da
 * referência usenorte.com, e levada aos espaços autenticados para o produto ser um só. A variável
 * CSS mantém o nome antigo para não mexer no `tailwind.config.ts` nem nos ecrãs.
 */
const manrope = localFont({
  // Fonte variável alojada no repositório (`src/app/fontes/`, licença OFL ao lado): o build deixou
  // de depender do Google Fonts, que a 02/11/2026 devolveu um ficheiro que o `next/font` não soube ler
  // e derrubou o build. Um ficheiro, todos os pesos de 200 a 800.
  src: './fontes/Manrope-variavel.woff2',
  weight: '200 800',
  variable: '--font-inter',
  display: 'swap',
});
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
