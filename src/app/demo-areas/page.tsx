import { MedirFachada } from './MedirFachada';

// Rota de demonstração para medir uma fachada a partir de uma fotografia (ver layout.tsx). Nenhuma
// leitura da base real e nenhum envio: a fotografia fica no browser de quem a importa.
export const dynamic = 'force-static';

export default function Page() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-5xl space-y-4 px-4 py-6 sm:px-6">
        <div>
          <h1 className="text-[20px] font-semibold">Medir uma fachada pela fotografia</h1>
          <p className="max-w-[60ch] text-[15px] text-slate-600">
            Uma fotografia, uma medida tirada com fita, e a fachada fica endireitada e à escala para se desenharem as zonas. Só para teste —
            rota de demonstração, fora do produto. A fotografia não sai deste aparelho.
          </p>
        </div>
        <MedirFachada />
      </div>
    </div>
  );
}
