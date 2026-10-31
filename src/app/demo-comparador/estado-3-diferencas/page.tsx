import { ComparacaoEmBlocos } from '@/components/ComparacaoEmBlocos';
import { construirComparacao } from '../dados';

// Estado 3 — Diferenças de âmbito, materiais e execução. O componente ComparacaoEmBlocos
// (src/components/ComparacaoEmBlocos.tsx), tal como é usado no telemóvel em
// src/app/app/pedidos/[id]/propostas/page.tsx, comparando Pintor A com Pintor B.
// Repetido por rota (já vem do layout.tsx): ver nota em estado-1-sintese/page.tsx.
export const dynamic = 'force-static';

export default function Page() {
  const { emBloco } = construirComparacao();
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-2xl p-4">
        <ComparacaoEmBlocos a={emBloco('a')} b={emBloco('b')} />
      </div>
    </div>
  );
}
