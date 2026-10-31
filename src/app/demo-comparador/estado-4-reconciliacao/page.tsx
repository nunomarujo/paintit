import { Reconciliacao } from '@/components/Reconciliacao';
import { construirComparacao } from '../dados';

// Estado 4 — Reconciliação económica entre duas propostas. O componente Reconciliacao
// (src/components/Reconciliacao.tsx) sobre reconciliar() (src/domain/reconciliacao.ts),
// comparando Pintor A com Pintor B — ambas com preço detalhado, para mostrar a cascata completa
// (âmbito, quantidade, execução, condições, preço, não decomposta). Esta rota é estática e
// sandboxed quando embebida (ver ComparadorDemo.tsx): o bloco "Perguntas que valem a pena fazer"
// (PerguntasASeguir) tem controlos nativamente interativos que, sem JavaScript, não respondem — o
// script de build marca-os `disabled` no HTML gerado (achado 2.2 do resumo v4).
// Repetido por rota (já vem do layout.tsx): ver nota em estado-1-sintese/page.tsx.
export const dynamic = 'force-static';

export default function Page() {
  const { emLado } = construirComparacao();
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-3xl p-6">
        <Reconciliacao a={emLado('a')} b={emLado('b')} caminho="/_demo-comparador" />
      </div>
    </div>
  );
}
