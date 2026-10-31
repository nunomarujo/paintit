import { DemoOrcamento } from './DemoOrcamento';
import { CATALOGUE, INITIAL_ITEMS, ZONES } from './fixtures';

// Rota de demonstração para a captura do popup "Para quem → empresas de pintura" (ver
// layout.tsx). Nenhuma leitura da base real: zonas, trabalhos e produtos vêm todos de
// fixtures.ts.
// Repetido por rota (já vem do layout.tsx): se esta página sair um dia de debaixo desse layout,
// o build falha em vez de a rota passar a dinâmica sem ninguém notar.
export const dynamic = 'force-static';

export default function Page() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-4xl space-y-4 p-6">
        <div>
          <h1 className="text-[20px] font-semibold">Orçamento guiado</h1>
          <p className="text-[15px] text-slate-600">Fachada Norte, Sul e Poente — obra fictícia, só para demonstração.</p>
        </div>
        <DemoOrcamento zones={ZONES} items={INITIAL_ITEMS} catalogue={CATALOGUE} />
      </div>
    </div>
  );
}
