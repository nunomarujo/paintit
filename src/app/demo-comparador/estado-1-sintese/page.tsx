import { SinteseDasPropostas } from '@/components/SinteseDasPropostas';
import { formatArea } from '@/domain/request';
import { construirComparacao } from '../dados';
import { AREA_TOTAL_CM2 } from '../fixtures';

// Estado 1 — Síntese inicial das propostas. Mesmo componente (SinteseDasPropostas) e os mesmos
// dados (sinteseDasPropostas, src/domain/sintese.ts) que o ecrã real em
// src/app/app/pedidos/[id]/propostas/page.tsx.
export default function Page() {
  const { rows, linhasDaSintese, leituraDaSintese } = construirComparacao();
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-5xl space-y-8 p-6">
        <div>
          <h1 className="text-[26px] leading-tight font-semibold">Propostas recebidas</h1>
          <p className="mt-1 text-[17px] text-slate-600">
            Os pintores aparecem como Pintor A, B, C… pela ordem de chegada. Área do pedido: {formatArea(AREA_TOTAL_CM2)}.
          </p>
        </div>
        <SinteseDasPropostas linhas={linhasDaSintese} aliases={rows.map((r) => r.alias)} leitura={leituraDaSintese} />
      </div>
    </div>
  );
}
