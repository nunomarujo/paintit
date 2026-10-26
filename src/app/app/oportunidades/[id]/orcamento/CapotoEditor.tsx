'use client';

import { useState } from 'react';
import type { FormState } from '@/app/app/actions';
import { saveCapoto } from '@/app/app/oportunidades/orcamento-actions';
import { CapotoCorte, IsolanteSwatch } from '@/components/CapotoFigure';
import { useFormAction } from '@/components/useFormAction';
import type { CatalogueProduct } from '@/domain/works';
import {
  ACABAMENTOS,
  ACABAMENTO_INFO,
  CAMADAS,
  ESPESSURAS_MM,
  ISOLANTES,
  ISOLANTE_INFO,
  SITUACOES,
  SITUACAO_LABELS,
  TIPO_PRODUTO,
  camadasDe,
  capotoEmFalta,
  resumoCapoto,
  type Acabamento,
  type CapotoSpec,
  type Isolante,
  type Situacao,
} from '@/domain/etics';

const card = 'rounded-2xl border border-slate-200 bg-white p-4 sm:p-5';

/**
 * Capoto no orçamento (pedido do promotor, 24/10/2026). Um capoto é um sistema, não um material: o
 * orçamento tem de dizer isolante, espessura e acabamento, senão duas propostas com preços muito
 * diferentes podem estar a falar de obras diferentes e o cliente não tem como saber.
 *
 * A manutenção de um capoto existente é outra obra: não leva isolante nem placas, e o ecrã deixa de
 * as pedir em vez de convidar a inventá-las.
 */
export function CapotoEditor({
  proposalId,
  requestId,
  inicial,
  indisponivel,
  catalogo = [],
}: {
  proposalId: string;
  requestId: string;
  inicial: CapotoSpec | null;
  /** Produtos de isolamento do catálogo, para as sugestões — os mesmos que o passo dos trabalhos usa. */
  catalogo?: CatalogueProduct[];
  /** A coluna ainda não existe na base: mostra-se o aviso em vez do formulário. */
  indisponivel?: boolean;
}) {
  // A obra já foi declarada com capoto: o ecrã especifica-o, não volta a perguntar se o leva.
  const tem = true;
  const [spec, setSpec] = useState<CapotoSpec>(
    inicial ?? { situacao: 'novo_sobre_pintura', isolante: null, espessuraMm: 60, acabamento: null, demaos: 2 },
  );
  const [sugestoes, setSugestoes] = useState(false);
  const { state, pending, formProps } = useFormAction<FormState>(saveCapoto.bind(null, proposalId, requestId), { errors: {} });
  const manutencao = spec.situacao === 'manutencao';
  const falta = capotoEmFalta(spec);
  const camadas = camadasDe(spec);
  const produtos = spec.isolante ? catalogo.filter((p) => p.tipo === TIPO_PRODUTO[spec.isolante as keyof typeof TIPO_PRODUTO]) : [];

  if (indisponivel) {
    return (
      <section className={card}>
        <h3 className="font-semibold">Capoto</h3>
        <p className="mt-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-[17px] text-amber-900">
          Este separador ainda não está ligado à base de dados. Falta aplicar a migração
          <code className="mx-1">20261024160000_capoto_no_orcamento.sql</code>. Assim que o for, aparece aqui o sistema
          completo: situação da fachada, isolante, espessura e acabamento.
        </p>
      </section>
    );
  }

  return (
    <form {...formProps} className="space-y-6">
      <input type="hidden" name="tem" value="sim" />
      <input type="hidden" name="cor" value={spec.cor ?? ''} />
      <input type="hidden" name="situacao" value={spec.situacao} />
      <input type="hidden" name="isolante" value={spec.isolante ?? ''} />
      <input type="hidden" name="espessura" value={spec.espessuraMm ?? ''} />
      <input type="hidden" name="acabamento" value={spec.acabamento ?? ''} />
      <input type="hidden" name="demaos" value={spec.demaos ?? ''} />

      <section className={card}>
        <h3 className="font-semibold">Capoto</h3>
        <p className="mt-1 text-[17px] text-slate-600">
          Esta obra foi declarada com isolamento pelo exterior. Indique o tipo, a espessura e a cor — sem isso, duas
          propostas com preços muito diferentes podem estar a falar de obras diferentes.
        </p>
      </section>

      {tem && (
        <>
          <section className={card}>
            <h3 className="font-semibold">Situação da fachada</h3>
            <ul className="mt-3 space-y-2">
              {SITUACOES.map((s) => (
                <li key={s}>
                  <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-slate-200 p-3 text-[17px] hover:border-tinta-500">
                    <input
                      type="radio"
                      name="situacao-escolha"
                      checked={spec.situacao === s}
                      onChange={() => setSpec({ ...spec, situacao: s as Situacao })}
                      className="mt-0.5"
                    />
                    <span>
                      {SITUACAO_LABELS[s]}
                      {s === 'manutencao' && (
                        <span className="block text-slate-600">Não se aplicam placas: trabalha-se sobre o capoto que já lá está.</span>
                      )}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </section>

          {!manutencao && (
            <section className={card}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-semibold">Isolante</h3>
                <button type="button" onClick={() => setSugestoes(!sugestoes)} className="text-[17px] font-semibold text-tinta-700 hover:underline">
                  {sugestoes ? 'Fechar sugestões' : 'Ver sugestões'}
                </button>
              </div>
              {sugestoes && (
                <div className="mt-3 space-y-2 rounded-xl bg-slate-50 p-3 text-[17px]">
                  <p>
                    <strong>Na maioria das fachadas:</strong> EPS, 60 a 80 mm, com acabamento siloxano. É a combinação com
                    melhor relação entre preço e resultado.
                  </p>
                  <p>
                    <strong>Sem folga nos peitoris e soleiras:</strong> EPS grafitado, que isola o mesmo com menos espessura.
                  </p>
                  <p>
                    <strong>Edifício alto:</strong> lã mineral, que não arde.
                  </p>
                  <p>
                    <strong>Zona baixa da fachada, socos e paredes enterradas:</strong> XPS, que aguenta água e pancadas.
                  </p>
                  <p>
                    <strong>Exigência ambiental ou patrimonial:</strong> cortiça expandida.
                  </p>
                </div>
              )}
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {ISOLANTES.map((i) => {
                  const info = ISOLANTE_INFO[i];
                  const escolhido = spec.isolante === i;
                  return (
                    <li key={i}>
                      <button
                        type="button"
                        onClick={() => setSpec({ ...spec, isolante: i as Isolante })}
                        className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left ${escolhido ? 'border-tinta-600 bg-tinta-50' : 'border-slate-200 hover:border-slate-300'}`}
                      >
                        <IsolanteSwatch isolante={i} className="h-10 w-16 shrink-0" />
                        <span className="text-[17px]">
                          <span className="block font-semibold">{info.label}</span>
                          <span className="block text-slate-600">{info.resumo}</span>
                          <span className="block text-[15px] text-slate-500">
                            λ {info.lambda[0].toLocaleString('pt-PT')}–{info.lambda[1].toLocaleString('pt-PT')} W/(m·K) · {info.fogo}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
              {spec.isolante && produtos.length > 0 && (
                <div className="mt-4 rounded-xl border border-slate-200 p-3">
                  <p className="text-[17px] font-medium">
                    Produtos deste isolante no catálogo <span className="font-normal text-slate-500">({produtos.length})</span>
                  </p>
                  <ul className="mt-2 space-y-1 text-[17px]">
                    {produtos.slice(0, 6).map((p) => (
                      <li key={p.id} className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-100 py-1 last:border-0">
                        <span>
                          <span className="font-semibold">{p.marca}</span> {p.nome}
                          {p.descricao && <span className="block text-[15px] text-slate-600">{p.descricao}</span>}
                        </span>
                        <a href={`/app/catalogo/referencia/${p.id}`} target="_blank" rel="noreferrer" className="text-[15px] text-tinta-700 hover:underline">
                          Ver ficha
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {spec.isolante && (
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-[17px] font-medium">Vantagens</p>
                    <ul className="mt-1 list-disc pl-5 text-[17px] text-slate-700">
                      {ISOLANTE_INFO[spec.isolante].vantagens.map((v) => (
                        <li key={v}>{v}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-[17px] font-medium">A ter em conta</p>
                    <ul className="mt-1 list-disc pl-5 text-[17px] text-slate-700">
                      {ISOLANTE_INFO[spec.isolante].cuidados.map((v) => (
                        <li key={v}>{v}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </section>
          )}

          {!manutencao && (
            <section className={card}>
              <h3 className="font-semibold">Espessura</h3>
              <p className="mt-1 text-[17px] text-slate-600">
                Em Portugal continental o habitual é 60 a 80 mm. Mais espessura isola mais, mas a fachada avança e há que
                resolver peitoris, soleiras e caixas de estore.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {ESPESSURAS_MM.map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => setSpec({ ...spec, espessuraMm: e })}
                    className={`rounded-lg px-3 py-2 text-[17px] ${spec.espessuraMm === e ? 'bg-tinta-700 text-white' : 'border border-slate-300 hover:border-slate-400'}`}
                  >
                    {e} mm
                  </button>
                ))}
              </div>
            </section>
          )}

          <section className={card}>
            <h3 className="font-semibold">Acabamento</h3>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {ACABAMENTOS.map((a) => {
                const info = ACABAMENTO_INFO[a];
                const escolhido = spec.acabamento === a;
                return (
                  <li key={a}>
                    <button
                      type="button"
                      onClick={() => setSpec({ ...spec, acabamento: a as Acabamento })}
                      className={`w-full rounded-xl border p-3 text-left text-[17px] ${escolhido ? 'border-tinta-600 bg-tinta-50' : 'border-slate-200 hover:border-slate-300'}`}
                    >
                      <span className="block font-semibold">{info.label}</span>
                      <span className="block text-slate-600">{info.resumo}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
            <div className="mt-4 flex flex-wrap gap-4">
            <label className="block text-[17px]">
              Demãos do acabamento
              <input
                inputMode="numeric"
                value={spec.demaos ?? ''}
                onChange={(e) => setSpec({ ...spec, demaos: e.target.value ? Number(e.target.value) : null })}
                className="mt-1 block w-24 rounded-lg border border-slate-300 px-3 py-2"
              />
            </label>
            <label className="block text-[17px]">
              Cor
              <input
                value={spec.cor ?? ''}
                onChange={(e) => setSpec({ ...spec, cor: e.target.value })}
                placeholder="Ex.: branco, ou a cor existente"
                className="mt-1 block w-64 rounded-lg border border-slate-300 px-3 py-2"
              />
            </label>
            </div>
          </section>

          <section className={card}>
            <h3 className="font-semibold">O sistema</h3>
            <p className="mt-1 text-[17px] text-slate-600">{resumoCapoto(spec)}</p>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <CapotoCorte isolante={spec.isolante} espessuraMm={spec.espessuraMm} manutencao={manutencao} className="h-36 w-full" />
              <ol className="text-[17px]">
                {CAMADAS.filter((c) => camadas.includes(c.id)).map((c, i) => (
                  <li key={c.id} className="border-b border-slate-100 py-1 last:border-0">
                    <span className="font-medium">
                      {i + 1}. {c.label}
                    </span>
                    <span className="block text-slate-600">{c.descricao}</span>
                  </li>
                ))}
              </ol>
            </div>
            {falta.length > 0 && (
              <p className="mt-3 rounded-lg bg-amber-50 p-3 text-[17px] text-amber-900">
                Falta indicar: {falta.join(', ')}. Sem isso, o cliente não consegue comparar esta proposta com outra.
              </p>
            )}
          </section>
        </>
      )}

      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className="rounded-xl bg-tinta-700 px-5 py-2.5 font-semibold text-white disabled:bg-slate-300">
          {pending ? 'A guardar…' : 'Guardar'}
        </button>
        {state.message && <span className={state.ok ? 'text-[17px] text-tinta-700' : 'text-[17px] text-red-700'}>{state.message}</span>}
      </div>
    </form>
  );
}
