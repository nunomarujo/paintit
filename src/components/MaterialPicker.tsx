'use client';

import { useState } from 'react';
import { PRODUCT_TYPES, PRODUCT_TYPE_LABELS, type ProductType } from '@/domain/catalog';
import type { MaterialOption } from '@/lib/materials';

/**
 * Escolha do material de uma linha: tipo, depois sugestões de produtos concretos
 * com detalhes. Facultativo; um produto do catálogo é "material certificado":
 * o fornecedor confirma a compra e a entrega e o produto entra no contrato.
 */
export function MaterialPicker({ options }: { options: MaterialOption[] }) {
  const [tipo, setTipo] = useState<ProductType | ''>('');
  const [chosen, setChosen] = useState<MaterialOption | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const list = tipo ? options.filter((o) => o.tipo === tipo) : [];

  return (
    <fieldset className="space-y-3 rounded-xl border border-slate-200 p-4 text-sm">
      <legend className="px-1 font-medium text-slate-700">Material (facultativo)</legend>
      <input type="hidden" name="productId" value={chosen?.id ?? ''} />
      {chosen ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-tinta-50 p-3">
          <span>
            <span className="font-semibold">{chosen.label}</span>
            <span className="ml-2 rounded-full bg-tinta-100 px-2 py-0.5 text-xs font-semibold text-tinta-900">Material certificado</span>
            <span className="block text-slate-600">
              {chosen.fornecedor.nome}
              {chosen.precoComDesconto ? ` · ${chosen.precoComDesconto} por embalagem` : ''}
            </span>
          </span>
          <button type="button" onClick={() => setChosen(null)} className="text-slate-600 hover:underline">
            Trocar
          </button>
        </div>
      ) : (
        <>
          <label className="block">
            Tipo de material
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value as ProductType | '')}
              className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
            >
              <option value="">Nenhum ou escrever à mão</option>
              {PRODUCT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {PRODUCT_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </label>
          {tipo && list.length === 0 && <p className="text-slate-600">Ainda não há produtos deste tipo no catálogo.</p>}
          {list.length > 0 && (
            <ul className="space-y-2">
              {list.slice(0, 12).map((o) => (
                <li key={o.id} className="rounded-lg border border-slate-200 p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <span>
                      <span className="font-semibold">{o.label}</span>
                      <span className="block text-slate-600">{o.fornecedor.nome}</span>
                    </span>
                    <span className="text-right">
                      {o.descontoPct !== null && (
                        <span className="block font-semibold text-tinta-700">−{o.descontoPct.toLocaleString('pt-PT')}% nesta obra</span>
                      )}
                      {o.precoComDesconto && <span className="block">{o.precoComDesconto} / embalagem</span>}
                    </span>
                  </div>
                  {o.caracteristicas.length > 0 && <p className="mt-1 text-slate-600">{o.caracteristicas.slice(0, 2).join(' · ')}</p>}
                  <div className="mt-2 flex gap-3">
                    <button type="button" onClick={() => setChosen(o)} className="font-semibold text-tinta-700 hover:underline">
                      Escolher
                    </button>
                    <button type="button" onClick={() => setOpen(open === o.id ? null : o.id)} className="text-slate-600 hover:underline">
                      {open === o.id ? 'Fechar detalhes' : 'Ver detalhes'}
                    </button>
                  </div>
                  {open === o.id && (
                    <dl className="mt-3 grid gap-x-4 gap-y-1 border-t border-slate-100 pt-3 sm:grid-cols-2">
                      {o.caracteristicas.map((c) => (
                        <dd key={c} className="sm:col-span-2">
                          {c}
                        </dd>
                      ))}
                      <dt className="text-slate-500">Ficha técnica</dt>
                      <dd>
                        {o.temFicha ? (
                          <a href={`/app/fichas/${o.id}`} target="_blank" rel="noreferrer" className="text-tinta-700 hover:underline">
                            Abrir PDF
                          </a>
                        ) : (
                          'Não disponível'
                        )}
                      </dd>
                      <dt className="text-slate-500">Preço de mercado</dt>
                      <dd>{o.precoMercado ?? 'Não indicado'}</dd>
                      <dt className="text-slate-500">Preço para pintores</dt>
                      <dd>{o.precoFornecedor ?? 'Não indicado'}</dd>
                      <dt className="text-slate-500">Com o desconto desta obra</dt>
                      <dd>{o.precoComDesconto ?? '—'}</dd>
                      <dt className="text-slate-500">Entrega</dt>
                      <dd>{o.entrega}</dd>
                      <dt className="text-slate-500">Fornecedor</dt>
                      <dd>
                        {o.fornecedor.nome}
                        {o.fornecedor.telefone ? ` · ${o.fornecedor.telefone}` : ''}
                        {o.fornecedor.email ? ` · ${o.fornecedor.email}` : ''}
                      </dd>
                      <dt className="text-slate-500">Avaliação dos pintores</dt>
                      <dd>{o.fornecedor.avaliacao ?? 'Histórico insuficiente'}</dd>
                    </dl>
                  )}
                </li>
              ))}
            </ul>
          )}
          <label className="block">
            Ou descreva o produto
            <input name="produto" placeholder="Marca e referência" className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2" />
          </label>
        </>
      )}
      <p className="text-xs text-slate-500">
        Com um produto de um fornecedor certificado, o fornecedor confirma a compra e a entrega e o produto passa a fazer
        parte do contrato. Os clientes tendem a preferir propostas que se comprometem com o material.
      </p>
    </fieldset>
  );
}
