import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { BRAND } from '@/config/brand';
import './globals.css';

export const metadata: Metadata = {
  title: `${BRAND.name} — empreitadas de pintura`,
  description:
    'Plataforma para condomínios e particulares pedirem, compararem e contratarem empreitadas de pintura com pintores verificados.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-PT">
      <body>{children}</body>
    </html>
  );
}
