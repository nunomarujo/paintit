import { Reconciliacao } from '@/components/Reconciliacao';
import { construirComparacao } from '../dados';

// Estado 5 — A Escolha Quem Pinta contra a mais completa (Pintor A vs Pintor C, cenário de
// 02/11/2026): a reconciliação separa o que são trabalhos a mais, que não foram pedidos, do que é
// só diferença de preço nos mesmos trabalhos — e é essa segunda parte que a justificação da Escolha
// diz não ter explicação nas propostas. Mesma nota sobre PerguntasASeguir que o estado 4 (ver aí).
// Repetido por rota (já vem do layout.tsx): ver nota em estado-1-sintese/page.tsx.
export const dynamic = 'force-static';

export default function Page() {
  const { emLado } = construirComparacao();
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-3xl p-6">
        <Reconciliacao a={emLado('a')} b={emLado('c')} caminho="/_demo-comparador" />
      </div>
    </div>
  );
}
