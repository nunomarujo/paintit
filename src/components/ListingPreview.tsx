import { VolumeViewer } from '@/components/VolumeViewer';
import { BUILDING_KIND_LABELS, type BuildingKind } from '@/domain/organization';
import type { Fachada, Forma } from '@/domain/volume';
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
  /** Forma de implantação escolhida de entre as canónicas, quando foi caracterizada. */
  forma?: Forma | null;
  /** Janelas por piso em cada fachada, como declaradas na descrição da obra. */
  janelas?: Partial<Record<Fachada, number | null>>;
  descricao: string;
  trabalhos: string[];
  corAcabamento: string | null;
  prazoPropostas: string | null;
  execucaoDesde: string | null;
  execucaoAte: string | null;
  surfaces: { id?: string; kind: SurfaceKind; descricao: string | null; area: number; trabalhos?: string[] | null }[];
  /** Os trabalhos são iguais em todas as zonas? */
  trabalhosModo?: 'iguais' | 'diferencas' | 'nao_sei';
  ocupacaoViaPublica?: 'sim' | 'nao' | 'a_avaliar';
  /** Produtos de referência pedidos pelo cliente; fixo = não substituir. */
  preferidos?: { id: string; label: string; fixo: boolean }[];
  /** Só fotografias de pormenor aprovadas pela equipa da plataforma. */
  photos: { id: string; legenda: string | null }[];
}

const pt = (d: string | null) => (d ? d.split('-').reverse().join('/') : '—');

/**
 * O anúncio tal como o pintor o vê. É usado na pré-visualização do cliente e na
 * vista do pintor, para que as duas nunca divirjam: não recebe morada, nomes
 * nem o título interno, por construção. O volume é gerado dos dados do prédio
 * e as fotografias são só pormenores já revistos.
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
    <article className="rounded-2xl border border-slate-200 bg-white p-6 text-[17px]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[15px] font-semibold uppercase tracking-wide text-slate-500">Pedido {l.ref}</p>
          <h3 className="mt-1 text-[20px] font-semibold">
            {WORK_TYPE_LABELS[l.tipoObra]} · {l.concelho}
          </h3>
          <p className="text-slate-600">{caracteristicas.join(' · ')}</p>
        </div>
        <figure className="w-44 shrink-0">
          <VolumeViewer
            pisos={l.pisos}
            fachadas={l.fachadas}
            temVarandas={l.temVarandas}
            forma={l.forma ?? null}
            janelas={l.janelas}
            moradia={l.tipoImovel === 'moradia'}
            // Pormenores tal como caracterizados: vêm das superfícies que foram mesmo declaradas nesta
            // obra, nunca de fotografia (promotor, 24/10/2026). O desenho continua a ser o mesmo para
            // duas obras com as mesmas declarações, que é o que o mantém anónimo.
            elementos={{
              metalicos: l.surfaces.some((s) => s.kind === 'elementos_metalicos'),
              muro: l.surfaces.some((s) => s.kind === 'muro'),
              beirais: l.surfaces.some((s) => s.kind === 'beirais_cobertura'),
            }}
            className="h-32 w-full"
            legenda={false}
          />
          <figcaption className="text-center text-[15px] text-slate-500">Volume genérico, não à escala. Arrastar para rodar.</figcaption>
        </figure>
      </div>

      <dl className="mt-4 grid gap-3 sm:grid-cols-3">
        <div>
          <dt className="text-slate-500">Área total</dt>
          <dd className="text-[17px] font-semibold">{formatArea(total)}</dd>
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
          {l.trabalhosModo === 'iguais' && l.surfaces.length > 1 && <span className="block text-slate-500">Iguais em todas as zonas.</span>}
          {l.trabalhosModo === 'diferencas' && <span className="block text-slate-500">Comuns a todas as zonas, com ajustes indicados em algumas.</span>}
          {l.trabalhosModo === 'nao_sei' && (
            <span className="block font-medium text-amber-700">
              O cliente ainda não sabe se os trabalhos são iguais em todas as zonas: a proposta deve esclarecer as diferenças.
            </span>
          )}
        </p>
      )}
      {l.ocupacaoViaPublica && (
        <p className="mt-1">
          <span className="text-slate-500">Ocupação da via pública: </span>
          {l.ocupacaoViaPublica === 'sim' ? 'prevista (licenças a obter pelo pintor)' : l.ocupacaoViaPublica === 'nao' ? 'não prevista' : 'a avaliar pelo pintor'}
        </p>
      )}
      {l.corAcabamento && (
        <p className="mt-1">
          <span className="text-slate-500">Cor e acabamento: </span>
          {l.corAcabamento}
        </p>
      )}
      {l.preferidos && l.preferidos.length > 0 && (
        <div className="mt-1">
          <span className="text-slate-500">Produtos preferidos pelo cliente:</span>
          <ul className="mt-1 flex flex-wrap gap-1">
            {l.preferidos.map((p) => (
              <li key={p.id}>
                <a href={`/app/catalogo/referencia/${p.id}`} className={`badge ${p.fixo ? 'badge-amber' : 'badge-green'} hover:underline`}>
                  {p.label}
                  {p.fixo ? ' · fixo, não substituir' : ' · pode propor outro'}
                </a>
              </li>
            ))}
          </ul>
        </div>
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
                  {s.trabalhos && s.trabalhos.length > 0 && (
                    <span className="block text-slate-600">
                      Nesta zona: {s.trabalhos.map((t) => DESIRED_WORK_LABELS[t as DesiredWork] ?? t).join(', ')}
                    </span>
                  )}
                </td>
                <td className="py-1 text-right">{formatArea(s.area)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {l.photos.length > 0 && (
        <div className="mt-4">
          <p className="text-slate-500">Pormenores</p>
          <ul className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {l.photos.map((p) => (
              <li key={p.id}>
                <a href={`/app/fotos/${p.id}`} target="_blank" rel="noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element -- link temporário assinado, sem otimização */}
                  <img src={`/app/fotos/${p.id}`} alt={p.legenda ?? 'Pormenor da obra'} className="aspect-square w-full rounded-lg object-cover" />
                </a>
                {p.legenda && <p className="mt-1 text-[15px] text-slate-600">{p.legenda}</p>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </article>
  );
}
