import { SinteseDasPropostas } from '@/components/SinteseDasPropostas';
import { SugestoesQuemPinta } from '@/components/SugestoesQuemPinta';
import { formatArea } from '@/domain/request';
import { construirComparacao } from '../dados';
import { AREA_TOTAL_CM2 } from '../fixtures';

// Estado 1 — Síntese inicial das propostas. Mesmo componente (SinteseDasPropostas) e os mesmos
// dados (sinteseDasPropostas, src/domain/sintese.ts) que o ecrã real em
// src/app/app/pedidos/[id]/propostas/page.tsx.
// Repetido por rota (já vem do layout.tsx): se esta página sair um dia de debaixo desse layout,
// o build falha em vez de a rota passar a dinâmica sem ninguém notar.
export const dynamic = 'force-static';

export default function Page() {
  const { rows, linhasDaSintese, leituraDaSintese, indicacoes } = construirComparacao();
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-5xl space-y-8 p-6">
        <div>
          <h1 className="text-[26px] leading-tight font-semibold">Propostas recebidas</h1>
          <p className="mt-1 text-[17px] text-slate-600">
            Os pintores aparecem como Pintor A, B, C… pela ordem de chegada. Área do pedido: {formatArea(AREA_TOTAL_CM2)}.
          </p>
        </div>
        <SugestoesQuemPinta indicacoes={indicacoes} />
        <SinteseDasPropostas linhas={linhasDaSintese} aliases={rows.map((r) => r.alias)} leitura={leituraDaSintese} />
      </div>
    </div>
  );
}
