import type { ReactNode } from 'react';

// Rota interna, só para o script de build (scripts/gerar-demo-comparador.mjs) extrair o HTML já
// pré-renderizado de cada estado e publicá-lo em public/demo-comparador/ — ComparadorDemo.tsx
// mostra esses ficheiros estáticos num iframe isolado, nunca esta rota ao vivo. Dados fictícios,
// sem qualquer leitura da base real. Fora de qualquer navegação do produto.
export const dynamic = 'force-static';
export const metadata = { robots: { index: false, follow: false } };

export default function DemoComparadorLayout({ children }: { children: ReactNode }) {
  return children;
}
