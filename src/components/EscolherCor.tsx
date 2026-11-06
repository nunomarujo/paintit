'use client';

import { useRef, useState } from 'react';
import { AVISO_DA_COR, porFamilia, referenciaDaPaleta, referenciaDeFabricante, type CorDaPaleta } from '@/domain/corDaPintura';

export interface CorDeFabricante {
  marca: string;
  cor: string;
}

/**
 * «Escolher cor» (adenda 2, 06/11/2026): abre um painel com a paleta própria da Quem Pinta, por família,
 * e as cores de fabricante (só nome e marca, sem quadrado). Ao tocar numa pastilha vê-se a cor num
 * quadrado grande, com o nome e o código; «Confirmar» fecha e devolve a referência em texto (e o hex
 * aproximado, só da paleta própria). O campo continua a aceitar texto escrito à mão.
 *
 * `<dialog>` nativo, aberto com `showModal()`: fica na camada de cima do navegador, com o Esc e o foco
 * tratados por ele, e nenhum antepassado com `transform` ou `backdrop-filter` o encolhe.
 * Acessível: cada pastilha é um botão com o nome em texto; a cor nunca é a única informação.
 */
export function EscolherCor({
  paleta,
  fabricante = [],
  onConfirmar,
  rotulo = 'Escolher cor',
}: {
  paleta: CorDaPaleta[];
  fabricante?: CorDeFabricante[];
  onConfirmar: (referencia: string, hex: string | null) => void;
  rotulo?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [separador, setSeparador] = useState<'paleta' | 'fabricante'>('paleta');
  const [escolhida, setEscolhida] = useState<{ referencia: string; hex: string | null; nome: string } | null>(null);
  const abrir = () => {
    setEscolhida(null);
    ref.current?.showModal();
  };
  const fechar = () => ref.current?.close();

  return (
    <>
      <button type="button" className="btn-secondary btn-sm" onClick={abrir} disabled={paleta.length === 0 && fabricante.length === 0}>
        {rotulo}
      </button>
      <dialog
        ref={ref}
        aria-labelledby="escolher-cor-titulo"
        className="w-[min(100vw-2rem,46rem)] max-h-[90vh] rounded-2xl border border-slate-200 p-0 backdrop:bg-slate-900/50"
      >
        <div className="flex max-h-[90vh] flex-col">
          <header className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-3">
            <h2 id="escolher-cor-titulo" className="text-[20px] font-semibold">
              Escolher a cor
            </h2>
            <button type="button" className="btn-quiet btn-sm" onClick={fechar}>
              Fechar
            </button>
          </header>
          {escolhida ? (
            <div className="space-y-4 p-5">
              {escolhida.hex ? (
                <div className="h-48 w-full rounded-2xl border border-slate-300" style={{ backgroundColor: escolhida.hex }} aria-hidden />
              ) : (
                <p className="rounded-2xl border border-slate-200 px-4 py-6 text-[17px] text-slate-700">Cor de fabricante: sem pré-visualização no ecrã.</p>
              )}
              <p className="text-[20px] font-semibold">{escolhida.nome}</p>
              <p className="text-[17px] text-slate-700">{escolhida.referencia}</p>
              <p className="max-w-[54ch] text-[15px] text-slate-600">{AVISO_DA_COR}</p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => {
                    onConfirmar(escolhida.referencia, escolhida.hex);
                    fechar();
                  }}
                >
                  Confirmar
                </button>
                <button type="button" className="btn-secondary" onClick={() => setEscolhida(null)}>
                  Escolher outra
                </button>
              </div>
            </div>
          ) : (
            <div className="overflow-y-auto p-5">
              {fabricante.length > 0 && (
                <div role="tablist" aria-label="Origem da cor" className="mb-4 flex flex-wrap gap-2">
                  {(
                    [
                      ['paleta', 'Paleta Quem Pinta'],
                      ['fabricante', 'Cores de fabricante'],
                    ] as const
                  ).map(([id, nome]) => (
                    <button
                      key={id}
                      type="button"
                      role="tab"
                      aria-selected={separador === id}
                      className={separador === id ? 'btn-primary btn-sm' : 'btn-quiet btn-sm'}
                      onClick={() => setSeparador(id)}
                    >
                      {nome}
                    </button>
                  ))}
                </div>
              )}
              {separador === 'paleta' ? (
                <div className="space-y-5">
                  {porFamilia(paleta).map(([familia, cores]) => (
                    <section key={familia}>
                      <h3 className="text-[15px] font-semibold text-slate-600">{familia}</h3>
                      <ul className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {cores.map((c) => (
                          <li key={c.codigo}>
                            <button
                              type="button"
                              onClick={() => setEscolhida({ referencia: referenciaDaPaleta(c), hex: c.hex, nome: c.nome })}
                              className="flex min-h-[44px] w-full items-center gap-2 rounded-lg border border-slate-200 px-2 py-1.5 text-left text-[15px] hover:border-tinta-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-tinta-600"
                            >
                              <span className="h-7 w-7 shrink-0 rounded-full border border-slate-300" style={{ backgroundColor: c.hex }} aria-hidden />
                              <span>
                                {c.nome}
                                <span className="block text-[13px] text-slate-600">{c.codigo}</span>
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </section>
                  ))}
                  <p className="text-[15px] text-slate-600">{AVISO_DA_COR}</p>
                </div>
              ) : (
                <ul className="grid gap-2 sm:grid-cols-2">
                  {fabricante.map((f) => (
                    <li key={`${f.marca}-${f.cor}`}>
                      <button
                        type="button"
                        onClick={() => setEscolhida({ referencia: referenciaDeFabricante(f.marca, f.cor), hex: null, nome: f.cor })}
                        className="flex min-h-[44px] w-full items-center rounded-lg border border-slate-200 px-3 text-left text-[15px] hover:border-tinta-600"
                      >
                        {f.cor} <span className="ml-1 text-slate-600">· {f.marca}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </dialog>
    </>
  );
}
