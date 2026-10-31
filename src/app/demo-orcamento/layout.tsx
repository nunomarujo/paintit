import type { ReactNode } from 'react';

// Rota interna, só para gerar a captura real do popup "Para quem → empresas de pintura" (secção 2 do
// pedido do promotor sobre a landing v4): o mesmo WorksEditor do orçamento guiado real
// (src/app/app/oportunidades/[id]/orcamento/WorksEditor.tsx), com dados fictícios, montado isoladamente
// fora do fluxo normal da aplicação (sem pedido, sem proposta, sem autenticação). Mesmo padrão já usado
// em src/app/demo-comparador: dados fictícios, sem qualquer leitura da base real, force-static, noindex,
// fora de qualquer navegação do produto.
export const dynamic = 'force-static';
export const metadata = { robots: { index: false, follow: false } };

export default function DemoOrcamentoLayout({ children }: { children: ReactNode }) {
  return children;
}
