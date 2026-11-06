'use client';

import { useMemo, useRef, useState } from 'react';
import { ProductThumb } from '@/components/ProductThumb';
import { PRODUCT_TYPE_LABELS, type ProductType } from '@/domain/catalog';
import { DEMAOS_POR_OMISSAO, TIPOS_DA_LISTA_POR_OMISSAO, embalagensEstimadas, litrosEstimados, precosUnitarios } from '@/domain/materiaisDoInterior';
import { formatEuros } from '@/domain/money';

/** Só o que a lista mostra de cada produto de referência (`reference_products`, só os visíveis). */
export interface MaterialDeReferencia {
  id: string;
  marca: string;
  nome: string;
  tipo: ProductType;
  precoCents: number | null;
  embalagemL: number | null;
  m2PorEmbalagem: number | null;
  rendimentoM2L: number | null;
  embalagens: number[];
  precoData: string | null;
  precoFonte: string | null;
  fichaTecnica: string | null;
  fotoPath: string | null;
}

/**
 * «Lista de materiais» (adenda 2, 06/11/2026): os produtos de referência com os preços de mercado — com
 * data e fonte, e ditos como tal: não são preços da Quem Pinta nem de um pintor. A estimativa de consumo
 * (litros ≈ área ÷ rendimento × demãos) é sempre estimativa, nunca orçamento. Escolher aqui não encomenda
 * nada; é só uma preferência.
 */
export function ListaDeMateriais({ materiais, areaM2 }: { materiais: MaterialDeReferencia[]; areaM2: number | null }) {
  const ref = useRef<HTMLDialogElement>(null);
  const tiposPresentes = useMemo(() => [...new Set(materiais.map((m) => m.tipo))], [materiais]);
  const [tipos, setTipos] = useState<ProductType[]>(tiposPresentes.filter((t) => (TIPOS_DA_LISTA_POR_OMISSAO as readonly string[]).includes(t)));
  const [marca, setMarca] = useState('');
  const [demaos, setDemaos] = useState(DEMAOS_POR_OMISSAO);
  const marcas = useMemo(() => [...new Set(materiais.map((m) => m.marca))].sort(), [materiais]);
  const lista = materiais.filter((m) => (tipos.length === 0 || tipos.includes(m.tipo)) && (!marca || m.marca === marca));

  return (
    <>
      <button type="button" className="btn-secondary btn-sm" onClick={() => ref.current?.showModal()} disabled={materiais.length === 0}>
        Lista de materiais
      </button>
      <dialog ref={ref} aria-labelledby="materiais-titulo" className="w-[min(100vw-2rem,56rem)] max-h-[90vh] rounded-2xl border border-slate-200 p-0 backdrop:bg-slate-900/50">
        <div className="flex max-h-[90vh] flex-col">
          <header className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-3">
            <h2 id="materiais-titulo" className="text-[20px] font-semibold">
              Lista de materiais
            </h2>
            <button type="button" className="btn-quiet btn-sm" onClick={() => ref.current?.close()}>
              Fechar
            </button>
          </header>
          <div className="space-y-3 border-b border-slate-200 px-5 py-3">
            <p className="max-w-[54ch] text-[15px] text-slate-600">
              Preços de referência de mercado, com a data e a fonte de cada um — não são preços da Quem Pinta nem de um pintor. O consumo é uma
              estimativa{areaM2 ? ` para ${areaM2.toLocaleString('pt-PT')} m²` : ''}, não um orçamento.
            </p>
            <div className="flex flex-wrap items-end gap-3">
              <fieldset className="flex flex-wrap gap-x-4">
                <legend className="sr-only">Tipos</legend>
                {tiposPresentes.map((t) => (
                  <label key={t} className="flex min-h-[44px] items-center gap-2 text-[15px]">
                    <input type="checkbox" checked={tipos.includes(t)} onChange={(e) => setTipos((ts) => (e.target.checked ? [...ts, t] : ts.filter((x) => x !== t)))} />
                    {PRODUCT_TYPE_LABELS[t]}
                  </label>
                ))}
              </fieldset>
              <label className="text-[15px] font-medium text-slate-700">
                Marca
                <select className="campo mt-1" value={marca} onChange={(e) => setMarca(e.target.value)}>
                  <option value="">Todas</option>
                  {marcas.map((m) => (
                    <option key={m}>{m}</option>
                  ))}
                </select>
              </label>
              <label className="text-[15px] font-medium text-slate-700">
                Demãos
                <select className="campo mt-1" value={demaos} onChange={(e) => setDemaos(Number(e.target.value))}>
                  {[1, 2, 3].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
          <ul className="divide-y divide-slate-200 overflow-y-auto">
            {lista.length === 0 && <li className="px-5 py-4 text-[17px] text-slate-600">Nenhum produto com estes filtros.</li>}
            {lista.map((m) => {
              const u = precosUnitarios({ precoCents: m.precoCents, embalagemL: m.embalagemL, m2PorEmbalagem: m.m2PorEmbalagem, rendimentoM2L: m.rendimentoM2L });
              const litros = litrosEstimados(areaM2, m.rendimentoM2L, demaos);
              const latas = embalagensEstimadas(litros, m.embalagemL);
              return (
                <li key={m.id} className="flex gap-3 px-5 py-3 text-[15px]">
                  <ProductThumb fotoPath={m.fotoPath} alt={m.nome} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[17px] font-semibold">
                      {m.marca} · {m.nome}
                    </p>
                    <p className="text-slate-600">{PRODUCT_TYPE_LABELS[m.tipo]}</p>
                    <dl className="mt-1 grid grid-cols-[auto_1fr] gap-x-3 [font-variant-numeric:tabular-nums]">
                      <dt className="text-slate-600">Preço de referência</dt>
                      <dd>
                        {m.precoCents ? `${formatEuros(m.precoCents)}${m.embalagemL ? ` (${m.embalagemL.toLocaleString('pt-PT')} L)` : ''}` : 'Sem preço'}
                        {m.precoCents && (m.precoData || m.precoFonte) && (
                          <span className="text-slate-600"> · {[m.precoData?.split('-').reverse().join('/'), m.precoFonte].filter(Boolean).join(', ')}</span>
                        )}
                      </dd>
                      <dt className="text-slate-600">Por litro · por m²</dt>
                      <dd>
                        {u.porLitro ? formatEuros(u.porLitro) : '—'} · {u.porM2 ? `${formatEuros(u.porM2)} por demão` : '—'}
                      </dd>
                      <dt className="text-slate-600">Rendimento</dt>
                      <dd>{m.rendimentoM2L ? `${m.rendimentoM2L.toLocaleString('pt-PT')} m²/L` : 'Não indicado'}</dd>
                      {m.embalagens.length > 0 && (
                        <>
                          <dt className="text-slate-600">Embalagens</dt>
                          <dd>{m.embalagens.map((e) => `${e.toLocaleString('pt-PT')} L`).join(', ')}</dd>
                        </>
                      )}
                      {litros !== null && (
                        <>
                          <dt className="text-slate-600">Consumo estimado</dt>
                          <dd>
                            ≈ {litros.toLocaleString('pt-PT')} L em {demaos} {demaos === 1 ? 'demão' : 'demãos'}
                            {latas ? ` (${latas} ${latas === 1 ? 'embalagem' : 'embalagens'} de ${m.embalagemL!.toLocaleString('pt-PT')} L)` : ''}
                          </dd>
                        </>
                      )}
                    </dl>
                    {m.fichaTecnica && (
                      <a href={m.fichaTecnica} target="_blank" rel="noreferrer" className="mt-1 inline-flex min-h-[44px] items-center font-semibold text-tinta-700 underline">
                        Ficha técnica
                      </a>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </dialog>
    </>
  );
}
