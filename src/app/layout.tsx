import type { Metadata } from 'next';
import { Fraunces, Inter } from 'next/font/google';
import type { ReactNode } from 'react';
import { BRAND } from '@/config/brand';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const serif = Fraunces({ subsets: ['latin'], variable: '--font-serif', display: 'swap' });

export const metadata: Metadata = {
  title: `${BRAND.name} — empreitadas de pintura`,
  description:
    'Plataforma para condomínios e particulares pedirem, compararem e contratarem empreitadas de pintura com pintores verificados.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-PT" className={`${inter.variable} ${serif.variable}`}>
      <body>{children}</body>
    </html>
  );
}
