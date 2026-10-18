import { BUILDING_KIND_LABELS, type BuildingKind } from '@/domain/organization';
import {
  DESIRED_WORK_LABELS,
  SURFACE_KIND_LABELS,
  WORK_TYPE_LABELS,
  formatArea,
  type DesiredWork,
  type SurfaceKind,
  type WorkType,
} from '@/domain/request';

export interface ListingView {
  ref: string;
  tipoObra: WorkType;
  concelho: string;
  tipoImovel: BuildingKind;
  pisos: number | null;
  fachadas: number | null;
  temVarandas: boolean;
  descricao: string;
  trabalhos: string[];
  corAcabamento: string | null;
  prazoPropostas: string | null;
  execucaoDesde: string | null;
  execucaoAte: string | null;
  surfaces: { kind: SurfaceKind; descricao: string | null; area: number }[];
}

const pt = (d: string | null) => (d ? d.split('-').reverse().join('/') : '—');

/**
 * O anúncio tal como o pintor o vê. É usado na pré-visualização do cliente e na
 * vista do pintor, para que as duas nunca divirjam: não recebe morada, nomes
 * nem o título interno, por construção.
 */
export function ListingPreview({ l }: { l: ListingView }) {
  const total = l.surfaces.reduce((n, s) => n + s.area, 0);
  const caracteristicas = [
    BUILDING_KIND_LABELS[l.tipoImovel],
    l.pisos !== null ? `${l.pisos} pisos` : null,
    l.fachadas !== null ? `${l.fachadas} fachadas` : null,
    l.temVarandas ? 'com varandas' : null,
  ].filter(Boolean);

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-6 text-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Pedido {l.ref}</p>
      <h3 className="mt-1 text-lg font-semibold">
        {WORK_TYPE_LABELS[l.tipoObra]} · {l.concelho}
      </h3>
      <p className="text-slate-600">{caracteristicas.join(' · ')}</p>

      <dl className="mt-4 grid gap-3 sm:grid-cols-3">
        <div>
          <dt className="text-slate-500">Área total</dt>
          <dd className="text-base font-semibold">{formatArea(total)}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Propostas até</dt>
          <dd className="font-semibold">{pt(l.prazoPropostas)}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Execução</dt>
          <dd>{l.execucaoDesde || l.execucaoAte ? `${pt(l.execucaoDesde)} a ${pt(l.execucaoAte)}` : 'A combinar'}</dd>
        </div>
      </dl>

      {l.descricao && <p className="mt-4 whitespace-pre-line">{l.descricao}</p>}

      {l.trabalhos.length > 0 && (
        <p className="mt-3">
          <span className="text-slate-500">Trabalhos pretendidos: </span>
          {l.trabalhos.map((t) => DESIRED_WORK_LABELS[t as DesiredWork] ?? t).join(', ')}
        </p>
      )}
      {l.corAcabamento && (
        <p className="mt-1">
          <span className="text-slate-500">Cor e acabamento: </span>
          {l.corAcabamento}
        </p>
      )}

      {l.surfaces.length > 0 && (
        <table className="mt-4 w-full text-left">
          <thead className="text-slate-500">
            <tr>
              <th className="py-1 font-normal">Superfície</th>
              <th className="py-1 text-right font-normal">Área</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {l.surfaces.map((s, i) => (
              <tr key={i}>
                <td className="py-1">
                  {SURFACE_KIND_LABELS[s.kind]}
                  {s.descricao && <span className="block text-slate-500">{s.descricao}</span>}
                </td>
                <td className="py-1 text-right">{formatArea(s.area)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </article>
  );
}
