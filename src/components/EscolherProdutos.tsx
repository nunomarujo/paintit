'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ProductThumb } from '@/components/ProductThumb';
import { PRODUCT_TYPES, PRODUCT_TYPE_LABELS, type ProdutoEscolhivel, type ProductType } from '@/domain/catalog';
import { formatEuros } from '@/domain/money';
import { matchesSearch } from '@/domain/search';
import type { Preference } from '@/domain/reference';
import { ICONES } from '@/components/NavIcons';

/** O máximo que `preferencesFromForm` (src/domain/reference.ts) aceita. */
const MAXIMO = 12;

/**
 * Escolher produtos preferidos numa janela, e não numa lista aberta no meio do formulário.
 *
 * O catálogo de referência tem 263 fichas. Estavam todas no formulário do pedido, em caixas de
 * seleção, abaixo de "Produtos preferidos (opcional)": um muro de 263 linhas entre o cliente e o
 * resto do pedido, sem procura e sem preço (queixa do promotor, 28/10/2026). Ninguém escolhe assim —
 * ou desiste, ou marca o primeiro que reconhece.
 *
 * A janela mostra o mesmo que o pintor vê no catálogo (fotografia, tipo, acabamento, embalagem e
 * preço), com a mesma procura tolerante a gíria e a erros de escrita. O preço é o de referência do
 * fabricante, sem desconto nenhum: é o que o cliente pagaria se fosse ele a comprar, e é o único que
 * lhe diz respeito — descontos de fornecedor são do pintor (CLAUDE.md, regra 15).
 *
 * O formulário por baixo fica com o que interessa: os produtos escolhidos, e em cada um se é "fixo".
 */
export type { ProdutoEscolhivel };

export function EscolherProdutos({
  produtos,
  inicial = [],
  compacto = false,
  onChange,
}: {
  produtos: ProdutoEscolhivel[];
  inicial?: Preference[];
  /** Dentro de uma linha recolhível do formulário: sem moldura nem título próprios, lista curta. */
  compacto?: boolean;
  /** Avisa quem está à volta de quantos produtos estão escolhidos (para o resumo da linha). */
  onChange?: (escolhidos: Preference[]) => void;
}) {
  const [escolhidos, setEscolhidosEstado] = useState<Preference[]>(inicial);
  const setEscolhidos = (f: (atual: Preference[]) => Preference[]) =>
    setEscolhidosEstado((atual) => {
      const proximo = f(atual);
      onChange?.(proximo);
      return proximo;
    });
  const [aberto, setAberto] = useState(false);
  const [termo, setTermo] = useState('');
  const [tipo, setTipo] = useState<'' | ProductType>('');
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (aberto && !el.open) el.showModal();
    if (!aberto && el.open) el.close();
  }, [aberto]);

  const porId = useMemo(() => new Map(produtos.map((p) => [p.id, p])), [produtos]);
  const marcados = new Set(escolhidos.map((p) => p.id));

  const visiveis = useMemo(
    () =>
      produtos.filter(
        (p) =>
          (!tipo || p.tipo === tipo) &&
          (!termo.trim() ||
            matchesSearch(termo, { tipo: p.tipo, texto: `${p.marca} ${p.nome} ${p.descricao ?? ''} ${p.acabamento ?? ''}` })),
      ),
    [produtos, termo, tipo],
  );

  const alternar = (id: string) =>
    setEscolhidos((atual) =>
      atual.some((p) => p.id === id)
        ? atual.filter((p) => p.id !== id)
        : atual.length >= MAXIMO
          ? atual
          : [...atual, { id, fixo: false }],
    );

  const fixar = (id: string, fixo: boolean) =>
    setEscolhidos((atual) => atual.map((p) => (p.id === id ? { ...p, fixo } : p)));

  const cheio = escolhidos.length >= MAXIMO;

  return (
    <div className={compacto ? '' : 'rounded-2xl border border-slate-200 bg-white p-4 sm:p-5'}>
      {!compacto && <h3 className="text-[17px] font-medium text-slate-700">Produtos preferidos (opcional)</h3>}
      <p className={`text-[15px] text-slate-600 ${compacto ? '' : 'mt-1'}`}>
        {compacto
          ? '«Fixo» quer dizer que o pintor não o pode trocar; sem fixo, pode propor outro e a comparação mostra a diferença.'
          : 'Indique os produtos que gostaria que fossem usados. Marque “fixo” se o pintor não os pode trocar; sem “fixo”, pode propor outro e a comparação mostra se é mais caro ou mais barato.'}
      </p>

      {escolhidos.length === 0 ? (
        <p className="mt-3 text-[15px] text-slate-600">Nenhum produto indicado. O pintor escolhe o que considerar adequado ao suporte.</p>
      ) : (
        /* Uma linha por produto, o nome cortado a uma linha: numa coluna estreita a lista antiga
           partia cada nome em seis linhas e deixava de se ler (promotor, 01/11/2026). */
        <ul className={`mt-3 divide-y divide-slate-100 ${compacto ? 'max-h-64 overflow-y-auto overscroll-contain pr-1' : ''}`}>
          {escolhidos.map((pref) => {
            const p = porId.get(pref.id);
            const nome = p ? `${p.marca} ${p.nome}` : 'Produto já não disponível';
            return (
              <li key={pref.id} className="flex items-center gap-2 py-1.5">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-medium" title={nome}>
                    {nome}
                  </span>
                  {p && <span className="block truncate text-[13px] text-slate-600">{PRODUCT_TYPE_LABELS[p.tipo]}</span>}
                </span>
                <label className="flex min-h-[44px] shrink-0 items-center gap-1.5 text-[13px] text-slate-600">
                  <input type="checkbox" checked={pref.fixo} onChange={(ev) => fixar(pref.id, ev.target.checked)} />
                  fixo
                </label>
                <button
                  type="button"
                  onClick={() => alternar(pref.id)}
                  aria-label={`Retirar ${nome}`}
                  title="Retirar"
                  className="btn-quiet btn-sm shrink-0 px-2"
                >
                  <ICONES.fechar />
                </button>
                <input type="hidden" name="preferido" value={pref.id} />
                {pref.fixo && <input type="hidden" name="fixo" value={pref.id} />}
              </li>
            );
          })}
        </ul>
      )}

      <button type="button" onClick={() => setAberto(true)} className={`${compacto ? 'btn-quiet' : 'btn-secondary'} mt-3`}>
        {escolhidos.length === 0 ? 'Escolher produtos' : 'Escolher outros produtos'}
      </button>

      <dialog
        ref={ref}
        onClose={() => setAberto(false)}
        aria-labelledby="escolher-produtos-titulo"
        className="h-[min(90svh,44rem)] w-[min(44rem,94vw)] rounded-2xl p-0 text-[17px] text-slate-900 backdrop:bg-slate-900/40"
      >
        <div className="flex h-full flex-col">
          <div className="border-b border-slate-200 p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id="escolher-produtos-titulo" className="text-[20px] leading-snug font-semibold text-tinta-900">
                  Catálogo de produtos
                </h2>
                <p className="mt-1 text-[15px] text-slate-600">
                  Fichas de fabricante, com o preço de referência de venda ao público.
                </p>
              </div>
              <button type="button" onClick={() => setAberto(false)} aria-label="Fechar" className="btn-quiet btn-sm">
                <ICONES.fechar />
              </button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <input
                value={termo}
                onChange={(ev) => setTermo(ev.target.value)}
                placeholder="Procurar: tinta de fachada, esmalte, capoto…"
                aria-label="Procurar produto"
                className="campo min-w-[12rem] flex-1"
              />
              <select
                value={tipo}
                onChange={(ev) => setTipo(ev.target.value as '' | ProductType)}
                aria-label="Tipo de produto"
                className="campo w-auto"
              >
                <option value="">Todos os tipos</option>
                {PRODUCT_TYPES.filter((t) => produtos.some((p) => p.tipo === t)).map((t) => (
                  <option key={t} value={t}>
                    {PRODUCT_TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 sm:p-5">
            {visiveis.length === 0 ? (
              <p className="text-[17px] text-slate-600">Nenhum produto encontrado. Experimente outra palavra ou outro tipo.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {visiveis.map((p) => {
                  const marcado = marcados.has(p.id);
                  return (
                    <li key={p.id}>
                      <label
                        className={`flex min-h-[44px] cursor-pointer items-center gap-3 py-2 ${
                          !marcado && cheio ? 'opacity-50' : ''
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={marcado}
                          disabled={!marcado && cheio}
                          onChange={() => alternar(p.id)}
                        />
                        <ProductThumb
                          fotoPath={p.fotoPath}
                          alt=""
                          className="h-10 w-8 shrink-0 rounded-lg border border-slate-100 bg-white object-contain sm:h-12 sm:w-10"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block font-medium">
                            {p.marca} {p.nome}
                          </span>
                          <span className="block text-[15px] text-slate-500">
                            {PRODUCT_TYPE_LABELS[p.tipo]}
                            {p.acabamento ? ` · ${p.acabamento}` : ''}
                            {p.embalagem ? ` · ${p.embalagem}` : ''}
                          </span>
                        </span>
                        <span className="shrink-0 text-right text-[15px]">
                          {p.precoCents !== null && <span className="block font-medium">{formatEuros(p.precoCents)}</span>}
                          {p.unitarioCents !== null && (
                            <span className="block text-slate-500">
                              {formatEuros(p.unitarioCents)}/{p.unidade}
                            </span>
                          )}
                        </span>
                      </label>
                      {/* A ficha completa (ficha técnica, rendimento, vendedores) abre noutro separador, para
                          não perder a escolha a meio (promotor, 01/11/2026). */}
                      <a
                        href={`/app/catalogo/referencia/${p.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="-mt-1 mb-1 inline-flex min-h-[44px] items-center pl-7 text-[15px] font-semibold text-tinta-600 hover:underline"
                      >
                        Ver ficha do produto
                      </a>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 p-4 sm:p-5">
            <p className="text-[15px] text-slate-600">
              {escolhidos.length === 0
                ? 'Nenhum escolhido.'
                : `${escolhidos.length} de ${MAXIMO} escolhidos.`}
              {cheio && ' Retire um para escolher outro.'}
            </p>
            <button type="button" onClick={() => setAberto(false)} className="btn-primary">
              Concluir
            </button>
          </div>
        </div>
      </dialog>
    </div>
  );
}
