import { Logotipo } from '@/components/Logotipo';
import { MatrizDasPropostas } from '@/components/MatrizDasPropostas';
import { SinteseDasPropostas } from '@/components/SinteseDasPropostas';
import { BRAND } from '@/config/brand';
import { formatEuros } from '@/domain/money';
import { formatArea } from '@/domain/request';
import { qrCodeSvg } from '@/lib/qrcode';
import { VERSAO_METODOLOGIA, enderecoDaMetodologia, prioridadeEmPalavras } from '@/domain/metodologia';
import { construirComparacao } from '../dados';
import { AREA_TOTAL_CM2 } from '../fixtures';

const comSinal = (c: number) => (c === 0 ? '—' : `${c > 0 ? '+' : '−'}${formatEuros(Math.abs(c))}`);

// Estado 6 — Relatório para assembleia. Secções reais de
// src/app/app/pedidos/[id]/propostas/relatorio/page.tsx: a matriz (MatrizDasPropostas sobre
// matrizDasPropostas), a síntese em variante "papel" (SinteseDasPropostas sobre
// sinteseDasPropostas) e o quadro económico (quadroEconomico, src/domain/reconciliacao.ts).
export default function Page() {
  const { rows, linhasDaSintese, leituraDaSintese, linhasDaMatriz, economico, referencia } = construirComparacao();
  const enderecoMetodologia = enderecoDaMetodologia();
  const qrMetodologia = qrCodeSvg(enderecoMetodologia, 'Código QR da metodologia usada neste relatório');

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-4xl p-6">
        <article className="doc-relatorio relative bg-white p-8 text-slate-900 shadow-sm">
          <header className="flex items-start justify-between gap-8 border-b border-slate-200 pb-4">
            <div>
              <h1 className="font-semibold">Propostas recebidas</h1>
              <p className="mt-1">Condomínio do Edifício Miradouro (fictício)</p>
            </div>
            <div className="shrink-0 text-right">
              <Logotipo altura="15mm" className="ml-auto" />
              <dl className="mt-2 text-[11px] leading-snug text-tinta-800">
                <dd className="font-semibold tabular-nums">PP-2026-DEMO</dd>
                <dd>{rows.length} propostas</dd>
                <dd>{formatArea(AREA_TOTAL_CM2)}</dd>
              </dl>
            </div>
          </header>

          <section className="mt-6">
            <p className="doc-rotulo">1 · Síntese e apreciação {BRAND.name}</p>
            <MatrizDasPropostas linhas={linhasDaMatriz} variante="papel" />
            <p className="doc-rodape mt-2">São factos lidos das propostas, e não uma escolha da plataforma.</p>
          </section>

          <section className="mt-8">
            <h2 className="font-semibold">1.1 Como se comparou</h2>
            <p className="mt-1">{prioridadeEmPalavras()}</p>
            <div className="doc-tema mt-3 flex items-start gap-3">
              <div className="w-16 shrink-0" dangerouslySetInnerHTML={{ __html: qrMetodologia }} />
              <p className="doc-nota">
                <strong>Metodologia utilizada: versão {VERSAO_METODOLOGIA}</strong>
                <br />
                Critérios completos: {enderecoMetodologia}
              </p>
            </div>
          </section>

          <section className="mt-8">
            <h2 className="font-semibold">2. Comparativo detalhado</h2>
            <SinteseDasPropostas
              linhas={linhasDaSintese}
              aliases={rows.map((r) => r.alias)}
              leitura={leituraDaSintese}
              referencia={referencia.alias}
              titulo="2.1 Comparação lado a lado"
              variante="papel"
            />
          </section>

          <section className="mt-8">
            <h2 className="font-semibold">3. Explicação económica</h2>
            <p className="text-slate-600">De onde vem cada euro de diferença, e o que os orçamentos não permitem separar.</p>
            <h3 className="mt-4 font-semibold">3.1 Diferenças para {referencia.alias}</h3>
            <table className="mt-3 w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-300">
                  <th scope="col" className="py-2 pr-3 align-bottom font-semibold">Proposta</th>
                  <th scope="col" className="py-2 pr-3 text-right align-bottom font-semibold">Diferença para {referencia.alias}</th>
                  <th scope="col" className="py-2 pr-3 text-right align-bottom font-semibold">Parcela identificada</th>
                  <th scope="col" className="py-2 text-right align-bottom font-semibold">Por decompor</th>
                </tr>
              </thead>
              <tbody>
                {economico.map((l) => (
                  <tr key={l.alias} className="border-b border-slate-100">
                    <th scope="row" className="py-1.5 pr-3 text-left font-medium">{l.alias}</th>
                    <td className="py-1.5 pr-3 text-right font-semibold tabular-nums whitespace-nowrap">{comSinal(l.diferencaCents)}</td>
                    <td className="py-1.5 pr-3 text-right tabular-nums whitespace-nowrap">{l.identificadaCents === null ? '—' : comSinal(l.identificadaCents)}</td>
                    <td className="py-1.5 text-right tabular-nums whitespace-nowrap">{comSinal(l.porDecomporCents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="doc-nota mt-2 text-slate-600">
              <strong>Parcela identificada</strong> é a parte da diferença cuja causa se consegue atribuir a partir do que as
              propostas declaram. <strong>Por decompor</strong> é o resto: pode ser produtividade, equipamento, transporte,
              estrutura de custos ou risco assumido.
            </p>
          </section>
        </article>
      </div>
    </div>
  );
}
