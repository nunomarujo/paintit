import { Reconciliacao } from '@/components/Reconciliacao';
import { construirComparacao } from '../dados';

// Estado 5 — Justificação de diferenças não explicadas (a parte residual/"não decomposta").
// Mesmo componente Reconciliacao, agora Pintor B vs Pintor C: o Pintor C tem preço global
// (modoPreco: 'global'), o que faz reconciliar() devolver indecomponivel: true — a diferença
// inteira cai no bloco "Sem repartição possível", exactamente como a função real decide. Mesma
// nota sobre PerguntasASeguir que o estado 4 (ver aí).
export default function Page() {
  const { emLado } = construirComparacao();
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-3xl p-6">
        <Reconciliacao a={emLado('b')} b={emLado('c')} caminho="/_demo-comparador" />
      </div>
    </div>
  );
}
