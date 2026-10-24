import { CapotoMateriais } from '@/components/CapotoMateriais';
import { ProposalView } from '@/components/ProposalView';
import type { CapotoSpec } from '@/domain/etics';
import type { ProposalLine, ProposalTerms } from '@/domain/proposal';
import { formatArea } from '@/domain/request';

export interface QuoteDocumentData {
  /** A empresa que assina a obra. É ela que manda no topo da folha. */
  pintor: { nome: string; nif: string | null; telefone: string | null; email: string | null; logoUrl?: string | null };
  ref: string;
  concelho: string | null;
  tipoImovel: string | null;
  areaTotalCm2: number;
  data: string;
  validade: string | null;
  lines: (ProposalLine & { id: string })[];
  terms: ProposalTerms;
  zoneNames: Record<string, string>;
  products?: Record<string, unknown>;
  capoto?: CapotoSpec | null;
  /** Parágrafo de apresentação, escrito pelo pintor. Nunca inventado pela plataforma. */
  apresentacao?: string | null;
}

const pt = (d: string | null) => (d ? d.split('-').reverse().join('/') : '—');

/**
 * O documento do orçamento, tal como o cliente o recebe (pedido do promotor, 24/10/2026).
 *
 * A hierarquia é deliberada: **quem assina a obra é a empresa de pintura**, por isso é o nome dela que
 * domina o topo, e não a referência da proposta. A Quem Pinta aparece em marca de água discreta e numa
 * linha de rodapé — presente, sem disputar a página a quem vai executar o trabalho.
 *
 * Nunca mostra morada nem nome do cliente (anonimato até à apresentação) nem a comissão da plataforma
 * (CLAUDE.md, regra 13). Preparado para imprimir: é assim que se guarda em PDF.
 */
export function QuoteDocument({ d }: { d: QuoteDocumentData }) {
  return (
    <article className="relative mx-auto max-w-[210mm] overflow-hidden bg-white p-8 text-sm text-slate-900 shadow-md print:max-w-none print:p-0 print:shadow-none sm:p-12">
      {/* Marca de água: cinzento muito claro, para não escurecer na impressão a laser. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <span className="-rotate-[30deg] select-none whitespace-nowrap text-6xl font-bold tracking-wide text-slate-900/[0.04]">
          quempinta.pt
        </span>
      </div>

      <div className="relative">
        <header className="flex flex-wrap items-start justify-between gap-6 border-b border-slate-200 pb-5">
          <div className="flex items-start gap-4">
            {d.pintor.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- logótipo do pintor, tamanho fixo
              <img src={d.pintor.logoUrl} alt="" className="h-16 w-16 rounded-lg object-contain" />
            ) : null}
            <div>
              <h1 className="text-3xl font-bold leading-tight">{d.pintor.nome}</h1>
              <p className="mt-1 text-slate-600">
                {[d.pintor.nif ? `NIF ${d.pintor.nif}` : null, d.pintor.telefone, d.pintor.email].filter(Boolean).join(' · ') || 'Empresa de pintura'}
              </p>
            </div>
          </div>
          <div className="text-right text-xs text-slate-500">
            <p className="font-semibold uppercase tracking-wide">Orçamento</p>
            <p>Pedido {d.ref}</p>
            <p>{pt(d.data)}</p>
            {d.validade && <p>Válido até {pt(d.validade)}</p>}
          </div>
        </header>

        <section className="mt-5">
          <p className="text-slate-600">
            {[d.tipoImovel, d.concelho, formatArea(d.areaTotalCm2)].filter(Boolean).join(' · ')}
          </p>
          {d.apresentacao && <p className="mt-3 whitespace-pre-line leading-relaxed">{d.apresentacao}</p>}
        </section>

        <div className="mt-6">
          <ProposalView lines={d.lines} terms={d.terms} zoneNames={d.zoneNames} products={d.products as never} />
        </div>

        {d.capoto && <CapotoMateriais spec={d.capoto} />}

        <footer className="mt-8 border-t border-slate-200 pt-3 text-xs text-slate-500">
          Orçamento preparado em quempinta.pt. A morada e a identificação do cliente só são trocadas entre as partes
          depois de a proposta ser escolhida.
        </footer>
      </div>
    </article>
  );
}
