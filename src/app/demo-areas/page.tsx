import { DemoAreas } from './DemoAreas';

// Rota de demonstração para testar o modelo declarativo de áreas por volume contra fotografias
// reais (ver layout.tsx). Nenhuma leitura da base real: tudo corre no cliente.
export const dynamic = 'force-static';

export default function Page() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-5xl space-y-4 p-6">
        <div>
          <h1 className="text-[20px] font-semibold">Estimar áreas pelo volume do prédio</h1>
          <p className="text-[15px] text-slate-600">
            Indicar as dimensões reais do prédio (não de uma fotografia) e ver o volume e as áreas por categoria. Só para teste —
            rota de demonstração, fora do produto.
          </p>
        </div>
        <DemoAreas />
      </div>
    </div>
  );
}
