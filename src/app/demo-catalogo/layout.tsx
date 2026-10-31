import type { ReactNode } from 'react';

// Rota interna, só para gerar a captura real do popup "Para quem → fornecedores de tintas"
// (secção 2 do pedido do promotor sobre a landing v4): o mesmo ProductCard do catálogo real
// (src/components/ProductCard.tsx) e a mesma lista de descontos do ecrã real do fornecedor
// (src/app/app/organizacoes/[id]/produtos/page.tsx, secção "Descontos para pintores"), com dados
// fictícios. Mesmo padrão de src/app/demo-comparador e src/app/demo-orcamento: sem qualquer
// leitura da base real, force-static, noindex, fora de qualquer navegação do produto.
export const dynamic = 'force-static';
export const metadata = { robots: { index: false, follow: false } };

export default function DemoCatalogoLayout({ children }: { children: ReactNode }) {
  return children;
}
