import type { ReactNode } from 'react';

// Rota de teste da medição de uma fachada por fotografia com uma referência medida (homografia,
// 04/11/2026 — ver docs/DECISOES.md). Mesmo padrão já usado em
// src/app/demo-orcamento e src/app/demo-comparador: nenhuma leitura da base real, sem autenticação,
// force-static, noindex, fora de qualquer navegação do produto.
export const dynamic = 'force-static';
export const metadata = { robots: { index: false, follow: false } };

export default function DemoAreasLayout({ children }: { children: ReactNode }) {
  return children;
}
