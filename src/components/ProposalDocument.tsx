import { CapotoCorte } from '@/components/CapotoFigure';
import { ACABAMENTO_INFO, CAMADAS, ISOLANTE_INFO, SITUACAO_LABELS, camadasDe, resumoCapoto, type CapotoSpec } from '@/domain/etics';
import { formatEuros, percentOf } from '@/domain/money';
import {
  LINE_CATEGORY_LABELS,
  UNIT_LABELS,
  lineTotal,
  proposalTotals,
  type ProposalLine,
  type ProposalTerms,
} from '@/domain/proposal';
import { linesForZone, proposalIntro } from '@/domain/proposalDocument';
import { WORK_TYPE_LABELS, formatArea, type WorkType } from '@/domain/request';
import { BUILDING_KIND_LABELS, type BuildingKind } from '@/domain/organization';

const pt = (d: string | null) => (d ? d.split('-').reverse().join('/') : 'Não indicada');

const initials = (nome: string) =>
  nome
    .split(/\s+/)
    .filter((w) => w.length > 2 || w === w.toUpperCase())
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('') || nome.slice(0, 2).toUpperCase();

/**
 * Documento de orçamento (PROPOSTA.md, "Rever e enviar"): o ficheiro que o pintor entrega ao
 * cliente, e que o cliente usa para comparar propostas. Formato A4, pensado para imprimir ou
 * guardar em PDF com a impressão do navegador — sem bibliotecas de PDF.
 *
 * O nome da empresa de pintura domina o cabeçalho; a referência é informação de serviço, discreta.
 * Nunca mostra morada nem identidade do cliente (anonimato até à apresentação, CLAUDE.md regra 6),
 * nem a comissão da plataforma (regra 13). Todo o conteúdo vem de dados reais da proposta — nada é
 * inventado para preencher espaço.
 */
export function ProposalDocument({
  identity: painter,
  request,
  zones,
  lines,
  terms,
  capoto,
  submittedAt,
  revelado = false,
}: {
  /**
   * Quem assina o documento. Antes da apresentação (docs/MODELO.md) `label` é o alias anónimo
   * (`alias(i)`, src/domain/proposal.ts) e nif/telefone/emailContacto vêm `null` — nunca preencher
   * estes campos com dados reais do pintor antes da identidade estar revelada ao cliente.
   */
  identity: { label: string; nif: string | null; telefone: string | null; emailContacto: string | null };
  request: { ref: string; concelho: string; tipoObra: WorkType; tipoImovel: BuildingKind | null; areaTotalCm2: number };
  /** Zonas (fachadas) do pedido, para a grelha de âmbito. Omitir quando o pedido não tem zonas identificadas. */
  zones: { id: string; label: string; areaCm2: number }[];
  lines: (ProposalLine & { id: string })[];
  terms: ProposalTerms;
  capoto: CapotoSpec | null;
  submittedAt: string | null;
  /**
   * A identidade do pintor já foi revelada ao cliente? Enquanto não for, o documento **impresso ou
   * descarregado** não leva nome, logótipo nem contactos dele: no lugar vai a Quem Pinta. No ecrã,
   * a própria empresa continua a ver-se — o que não pode é sair daqui um ficheiro que a identifique
   * antes da apresentação (CLAUDE.md, regra 6; pedido do promotor, 24/10/2026).
   */
  revelado?: boolean;
}) {
  const totals = proposalTotals(lines, terms.ivaBps);
  const included = lines.filter((l) => l.inclusao === 'incluido');
  const intro = proposalIntro(terms, lines, capoto);
  const camadas = capoto ? camadasDe(capoto) : [];
  const iso = capoto?.isolante ? ISOLANTE_INFO[capoto.isolante] : null;
  const acab = capoto?.acabamento ? ACABAMENTO_INFO[capoto.acabamento] : null;

  return (
    <div className="proposal-doc">
      {/* Página 1 — capa, obra, apresentação, trabalhos discriminados */}
      <Sheet page={1} of={capoto ? 3 : 2} footer>
        <header className="flex items-start justify-between gap-6 border-b border-slate-300 pb-4">
          <div className={`flex items-start gap-3 ${revelado ? '' : 'print:hidden'}`}>
            <div className="flex h-11 w-11 shrink-0 items-center justify-center border border-slate-900 font-serif text-sm text-slate-900">
              {initials(painter.label)}
            </div>
            <div>
              <h1 className="font-serif text-[19px] leading-tight text-slate-900">{painter.label}</h1>
              <p className="eyebrow mt-1">
                {painter.nif ? `NIF ${painter.nif}` : ''}
                {painter.telefone ? ` · ${painter.telefone}` : ''}
                {painter.emailContacto ? ` · ${painter.emailContacto}` : ''}
              </p>
            </div>
          </div>
          {/* No ficheiro impresso ou descarregado, enquanto a obra não for ganha, é a plataforma que
              assina o documento: o nome, o logótipo e os contactos do pintor não saem daqui. */}
          {!revelado && (
            <div className="hidden items-start gap-3 print:flex">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center border border-slate-900 font-serif text-sm text-slate-900">
                QP
              </div>
              <div>
                <h1 className="font-serif text-[19px] leading-tight text-slate-900">QuemPinta.pt</h1>
                <p className="eyebrow mt-1">Proposta preparada por empresa de pintura verificada</p>
              </div>
            </div>
          )}
          <div className="shrink-0 text-right text-[11px] text-slate-500">
            <p className="eyebrow">Ref. do pedido</p>
            <p className="font-mono text-slate-700">{request.ref}</p>
            {submittedAt && <p className="mt-1">Enviada a {pt(submittedAt.slice(0, 10))}</p>}
          </div>
        </header>
        {!revelado && (
          <p className="mt-3 rounded border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] leading-snug text-slate-600 print:bg-white">
            Esta proposta foi preparada por uma empresa de pintura verificada pela Quem Pinta. O nome e os contactos
            dela substituem este cabeçalho assim que a obra lhe for adjudicada; até lá, as duas partes comunicam pela
            plataforma.
          </p>
        )}


        <dl className="grid grid-cols-4 gap-4 border-b border-slate-200 py-4 text-[12px]">
          <div>
            <dt className="eyebrow">Concelho</dt>
            <dd className="mt-0.5">{request.concelho}</dd>
          </div>
          <div>
            <dt className="eyebrow">Tipo de edifício</dt>
            <dd className="mt-0.5">{request.tipoImovel ? BUILDING_KIND_LABELS[request.tipoImovel] : WORK_TYPE_LABELS[request.tipoObra]}</dd>
          </div>
          <div>
            <dt className="eyebrow">Tipo de obra</dt>
            <dd className="mt-0.5">{WORK_TYPE_LABELS[request.tipoObra]}</dd>
          </div>
          <div>
            <dt className="eyebrow">Área total</dt>
            <dd className="mt-0.5">{formatArea(request.areaTotalCm2)}</dd>
          </div>
        </dl>

        <div className="border-b border-slate-200 py-4" style={{ minHeight: '22mm' }}>
          <p className="eyebrow mb-1.5">Nota da proposta</p>
          <p className="max-w-[68ch] text-[12px] leading-relaxed text-slate-700">{intro}</p>
        </div>

        {zones.length > 1 && (
          <div className="border-b border-slate-200 py-4">
            <p className="eyebrow mb-2">Âmbito por zona</p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-[11.5px]">
              {zones.map((z) => {
                const n = linesForZone(lines, z.id).length;
                return (
                  <div key={z.id} className="flex items-baseline justify-between gap-3 border-t border-slate-100 pt-1.5">
                    <span>{z.label}</span>
                    <span className="font-mono text-slate-500">
                      {formatArea(z.areaCm2)} · {n} {n === 1 ? 'trabalho' : 'trabalhos'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="py-4">
          <p className="eyebrow mb-2">Trabalhos discriminados</p>
          <table className="w-full text-[11px]">
            <thead>
              <tr className="border-b border-slate-900 text-left text-slate-500">
                <th className="w-[46%] pb-1.5 font-medium">Trabalho</th>
                <th className="w-[18%] pb-1.5 font-medium text-right">Quantidade</th>
                <th className="w-[18%] pb-1.5 font-medium text-right">Preço unit.</th>
                <th className="w-[18%] pb-1.5 font-medium text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {included.map((l) => (
                <tr key={l.id} className="border-b border-slate-200">
                  <td className="py-1.5 pr-2">
                    <span className="font-medium">{l.descricao}</span>
                    <span className="block text-[10px] text-slate-500">
                      {LINE_CATEGORY_LABELS[l.categoria].split(' (')[0]}
                      {l.produto ? ` · ${l.produto}` : ''}
                      {l.demaos ? ` · ${l.demaos} demão${l.demaos > 1 ? 's' : ''}` : ''}
                    </span>
                  </td>
                  <td className="py-1.5 text-right font-mono">
                    {(l.quantidade / 100).toLocaleString('pt-PT', { maximumFractionDigits: 2 })} {UNIT_LABELS[l.unidade]}
                  </td>
                  <td className="py-1.5 text-right font-mono">{formatEuros(l.precoUnitario)}</td>
                  <td className="py-1.5 text-right font-mono">{formatEuros(lineTotal(l))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Sheet>

      {/* Página de materiais — só quando a obra leva capoto */}
      {capoto && (
        <Sheet page={2} of={3} footer>
          <RunningHeader painter={painter} request={request} revelado={revelado} />
          <h2 className="mt-5 font-serif text-[16px] text-slate-900">{resumoCapoto(capoto)}</h2>
          <p className="mt-1 text-[11px] text-slate-500">{SITUACAO_LABELS[capoto.situacao]}.</p>

          <div className="mt-4 grid grid-cols-[1fr_1.2fr] gap-8">
            <CapotoCorte isolante={capoto.isolante} espessuraMm={capoto.espessuraMm} manutencao={capoto.situacao === 'manutencao'} className="h-40 w-full" />
            <table className="w-full self-start text-[10.5px]">
              <thead>
                <tr className="border-b border-slate-900 text-left text-slate-500">
                  <th className="w-[34%] pb-1 font-medium">Camada</th>
                  <th className="pb-1 font-medium">O que faz</th>
                </tr>
              </thead>
              <tbody>
                {CAMADAS.filter((c) => camadas.includes(c.id)).map((c, i) => (
                  <tr key={c.id} className="border-b border-slate-200">
                    <td className="py-1.5 pr-2 font-medium">
                      {i + 1}. {c.label}
                    </td>
                    <td className="py-1.5 text-slate-600">{c.descricao}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-6">
            {iso && capoto.isolante && (
              <div className="border border-slate-200 p-3">
                <p className="text-[12px] font-semibold">
                  {iso.label}
                  {capoto.espessuraMm ? `, ${capoto.espessuraMm} mm` : ''}
                </p>
                <p className="mt-0.5 text-[10.5px] text-slate-600">{iso.resumo}</p>
                <div className="mt-2 grid grid-cols-1 gap-2 text-[10px]">
                  <div>
                    <p className="eyebrow">Vantagens</p>
                    <ul className="mt-1 list-disc space-y-0.5 pl-3.5 text-slate-700">
                      {iso.vantagens.map((v) => (
                        <li key={v}>{v}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="eyebrow">A ter em conta</p>
                    <ul className="mt-1 list-disc space-y-0.5 pl-3.5 text-slate-700">
                      {iso.cuidados.map((v) => (
                        <li key={v}>{v}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}
            {acab && (
              <div className="border border-slate-200 p-3">
                <p className="text-[12px] font-semibold">
                  Acabamento {acab.label.toLowerCase()}
                  {capoto.demaos ? ` · ${capoto.demaos} ${capoto.demaos === 1 ? 'demão' : 'demãos'}` : ''}
                </p>
                <p className="mt-0.5 text-[10.5px] text-slate-600">{acab.resumo}</p>
                <div className="mt-2 grid grid-cols-1 gap-2 text-[10px]">
                  <div>
                    <p className="eyebrow">Vantagens</p>
                    <ul className="mt-1 list-disc space-y-0.5 pl-3.5 text-slate-700">
                      {acab.vantagens.map((v) => (
                        <li key={v}>{v}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="eyebrow">A ter em conta</p>
                    <ul className="mt-1 list-disc space-y-0.5 pl-3.5 text-slate-700">
                      {acab.cuidados.map((v) => (
                        <li key={v}>{v}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>

          <p className="mt-5 max-w-[68ch] text-[10px] leading-relaxed text-slate-500">
            Um capoto é um sistema certificado: a cola, o isolante, a argamassa de base, a rede, os perfis e o acabamento
            vêm aprovados em conjunto pelo fabricante. Misturar marcas por conveniência anula a garantia do sistema.
          </p>
        </Sheet>
      )}

      {/* Última página — preço e condições */}
      <Sheet page={capoto ? 3 : 2} of={capoto ? 3 : 2} footer>
        <RunningHeader painter={painter} request={request} revelado={revelado} />
        <h2 className="mt-5 font-serif text-[16px] text-slate-900">Preço e condições</h2>

        <table className="mt-4 w-full text-[11.5px]">
          <tbody>
            {Object.entries(
              included.reduce<Record<string, number>>((acc, l) => {
                const label = LINE_CATEGORY_LABELS[l.categoria].split(' (')[0] ?? LINE_CATEGORY_LABELS[l.categoria];
                acc[label] = (acc[label] ?? 0) + lineTotal(l);
                return acc;
              }, {}),
            ).map(([label, total]) => (
              <tr key={label} className="border-b border-slate-200">
                <td className="py-1.5">{label}</td>
                <td className="py-1.5 text-right font-mono">{formatEuros(total)}</td>
              </tr>
            ))}
            <tr>
              <td className="pt-2 text-slate-500">Subtotal sem IVA</td>
              <td className="pt-2 text-right font-mono text-slate-500">{formatEuros(totals.base)}</td>
            </tr>
            <tr>
              <td className="py-0.5 text-slate-500">IVA ({terms.ivaBps / 100}%)</td>
              <td className="py-0.5 text-right font-mono text-slate-500">{formatEuros(totals.iva)}</td>
            </tr>
            <tr className="border-t border-slate-900">
              <td className="pt-1.5 font-serif text-[13px]">Total</td>
              <td className="pt-1.5 text-right font-serif text-[13px]">{formatEuros(totals.totalComIva)}</td>
            </tr>
          </tbody>
        </table>

        {(terms.adiantamentoBps > 0 || terms.fases.length > 0) && (
          <div className="mt-4 grid grid-cols-3 gap-3">
            {terms.adiantamentoBps > 0 && (
              <div className="border border-slate-200 p-2.5">
                <p className="eyebrow">Adiantamento de adjudicação</p>
                <p className="mt-0.5 font-mono text-[11px]">
                  {terms.adiantamentoBps / 100}% — {formatEuros(percentOf(totals.base, terms.adiantamentoBps))}
                </p>
              </div>
            )}
            {terms.fases.map((f) => (
              <div key={f.nome} className="border border-slate-200 p-2.5">
                <p className="eyebrow">{f.nome}</p>
                <p className="mt-0.5 font-mono text-[11px]">
                  {f.bps / 100}% — {formatEuros(percentOf(totals.base, f.bps))}
                </p>
              </div>
            ))}
          </div>
        )}

        <dl className="mt-5 grid grid-cols-2 gap-x-8 gap-y-3 border-t border-slate-200 pt-4 text-[11px]">
          <div>
            <dt className="eyebrow">Validade da proposta</dt>
            <dd className="mt-0.5">Até {pt(terms.validade)}</dd>
          </div>
          <div>
            <dt className="eyebrow">Duração estimada</dt>
            <dd className="mt-0.5">{terms.duracaoDias ? `${terms.duracaoDias} dias úteis` : 'Não indicada'}</dd>
          </div>
          <div>
            <dt className="eyebrow">Garantias</dt>
            <dd className="mt-0.5">
              A legal, sempre aplicável{terms.garantiaAnos ? ` · mais ${terms.garantiaAnos} ${terms.garantiaAnos === 1 ? 'ano' : 'anos'} de garantia adicional` : ''}
            </dd>
          </div>
          <div>
            <dt className="eyebrow">Seguros</dt>
            <dd className="mt-0.5">
              {terms.seguroRc === 'sim' ? 'RC declarada' : terms.seguroRc === 'nao' ? 'Sem RC declarada' : 'RC por declarar'} ·{' '}
              {terms.seguroAt === 'sim' ? 'acidentes de trabalho declarado' : terms.seguroAt === 'nao' ? 'sem seguro de acidentes declarado' : 'acidentes de trabalho por declarar'}
            </dd>
          </div>
          {terms.exclusoes && (
            <div className="col-span-2">
              <dt className="eyebrow">Exclusões</dt>
              <dd className="mt-0.5 whitespace-pre-line">{terms.exclusoes}</dd>
            </div>
          )}
          {terms.notas && (
            <div className="col-span-2">
              <dt className="eyebrow">Notas</dt>
              <dd className="mt-0.5 whitespace-pre-line">{terms.notas}</dd>
            </div>
          )}
        </dl>
      </Sheet>
    </div>
  );
}

// O cabeçalho corrido das páginas seguintes é tão identificativo como o da primeira: enquanto a
// identidade não estiver revelada, o que sai impresso é a plataforma (regra 6).
function RunningHeader({
  painter,
  request,
  revelado,
}: {
  painter: { label: string };
  request: { ref: string };
  revelado: boolean;
}) {
  return (
    <div className="flex items-center justify-between border-b border-slate-300 pb-3">
      <p className="font-serif text-[14px]">
        <span className={revelado ? '' : 'print:hidden'}>{painter.label}</span>
        {!revelado && <span className="hidden print:inline">QuemPinta.pt</span>}
      </p>
      <p className="eyebrow">Ref. {request.ref}</p>
    </div>
  );
}

/** Uma folha A4: marca de água discreta e rodapé com a atribuição à plataforma, nunca a comissão. */
function Sheet({ children, page, of, footer }: { children: React.ReactNode; page: number; of: number; footer?: boolean }) {
  return (
    <article className="proposal-sheet relative bg-white" aria-label={`Página ${page} de ${of}`}>
      <span aria-hidden className="proposal-watermark">
        quempinta.pt
      </span>
      <div className="relative">{children}</div>
      {footer && (
        <footer className="proposal-footer mt-6 flex items-center justify-between border-t border-slate-200 pt-2 text-[9px] text-slate-500">
          <p>Orçamento preparado em quempinta.pt</p>
          <p className="font-mono">
            {page} / {of}
          </p>
        </footer>
      )}
    </article>
  );
}
