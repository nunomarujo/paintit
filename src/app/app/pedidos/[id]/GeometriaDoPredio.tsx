'use client';

import { useState } from 'react';
import type { FormState } from '@/app/app/actions';
import { guardarMedidasDoPredio } from '@/app/app/pedidos/actions';
import { Dica } from '@/components/Dica';
import { EstadoDeGravacao } from '@/components/EstadoDeGravacao';
import { useFormAction } from '@/components/useFormAction';

/**
 * As medidas do prédio — a geometria, separada das zonas a pintar —, numa linha por baixo do desenho.
 *
 * «A alteração de largura, profundidade ou altura deve atualizar o modelo» (promotor, 30/10/2026): os
 * campos são de quem desenha (`ZonasComVolume`), e o desenho muda enquanto se escreve, antes de
 * gravar. «Não inferir geometria a partir de áreas insuficientes»: um campo em branco fica por medir,
 * a cota desse eixo não se desenha, e nada se calcula a partir das áreas das zonas.
 *
 * Na proposta B (05/11/2026) deixou de ser um cartão com o desenho dentro e passou a ser a linha do
 * prédio: o desenho é o do quadro das zonas, um só. Com o prédio ainda por medir, a linha diz isso e
 * oferece «Indicar as medidas», em vez de pôr três campos vazios à frente de quem chega.
 */

export interface MedidasEmTexto {
  /** Em metros, como se escrevem («12», «2,8»); vazio = por medir. */
  largura: string;
  profundidade: string;
  peDireito: string;
  origem: string;
}

export const ORIGEM_DAS_MEDIDAS: Record<string, string> = {
  estimativa: 'De olho',
  medicao: 'Medidas no local',
  planta: 'Lidas numa planta',
};

const metros = (t: string) => `${t.trim()} m`;

export function GeometriaDoPredio({
  buildingId,
  requestId,
  pisos,
  fachadas,
  medidas,
  altura,
  aoMudar,
  podeEditar,
  podeMedir,
}: {
  buildingId: string;
  requestId: string;
  pisos: number | null;
  fachadas: number | null;
  medidas: MedidasEmTexto;
  /** A altura (pisos × pé-direito), já escrita; nula quando falta uma das parcelas. */
  altura: string | null;
  aoMudar: (m: MedidasEmTexto) => void;
  podeEditar: boolean;
  /** A migração das medidas pode ainda não estar aplicada; sem ela, não se oferece o que não grava. */
  podeMedir: boolean;
}) {
  const { state, pending, repetir, formProps } = useFormAction<FormState>(guardarMedidasDoPredio.bind(null, buildingId, requestId), {
    errors: {},
  });
  const vazio = !medidas.largura.trim() && !medidas.profundidade.trim() && !medidas.peDireito.trim();
  const [aberto, setAberto] = useState(!vazio);
  const factos = [
    pisos ? `${pisos} ${pisos === 1 ? 'piso' : 'pisos'}` : null,
    fachadas ? `${fachadas} ${fachadas === 1 ? 'fachada' : 'fachadas'} à vista` : null,
  ]
    .filter(Boolean)
    .join(' · ');
  const nome = <span className="font-semibold text-tinta-900">O prédio</span>;

  if (!podeMedir || !podeEditar || (vazio && !aberto)) {
    const conhecidas = [
      medidas.largura.trim() ? `frente ${metros(medidas.largura)}` : null,
      medidas.profundidade.trim() ? `fundo ${metros(medidas.profundidade)}` : null,
      medidas.peDireito.trim() ? `pé-direito ${metros(medidas.peDireito)}` : null,
    ].filter(Boolean);
    return (
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
        <p className="text-[15px] text-slate-600">
          {nome}
          {factos && ` · ${factos}`}
          {podeMedir &&
            (conhecidas.length > 0
              ? ` · ${conhecidas.join(' · ')}, ${(ORIGEM_DAS_MEDIDAS[medidas.origem] ?? 'de olho').toLowerCase()}`
              : ' · frente, fundo e pé-direito por medir. O desenho está em proporções genéricas.')}
        </p>
        {podeMedir && podeEditar && (
          <button type="button" onClick={() => setAberto(true)} className="btn-quiet btn-sm">
            Indicar as medidas
          </button>
        )}
      </div>
    );
  }

  const muda = (campo: keyof MedidasEmTexto) => (ev: { target: { value: string } }) => aoMudar({ ...medidas, [campo]: ev.target.value });
  const e = state.errors;
  const campo = (id: keyof MedidasEmTexto, rotulo: string) => (
    <div className="w-[6.5rem]">
      <label htmlFor={`predio-${id}`} className="block text-[15px] text-slate-600">
        {rotulo}
      </label>
      <div className="relative mt-1">
        <input
          id={`predio-${id}`}
          name={id}
          inputMode="decimal"
          autoComplete="off"
          value={medidas[id]}
          onChange={muda(id)}
          aria-invalid={e[id] ? true : undefined}
          className="campo pr-8 tabular-nums"
        />
        <span aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[15px] text-slate-600">
          m
        </span>
      </div>
    </div>
  );
  const erros = (['largura', 'profundidade', 'peDireito', 'origem'] as const).map((k) => e[k]).filter(Boolean);

  return (
    <form {...formProps} className="space-y-2">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="min-w-[14rem] flex-1 pb-1">
          {/* Um `<div>`: o (i) é um `<details>`, que não pode viver dentro de um parágrafo. */}
          <div className="flex items-center gap-2 text-[15px]">
            {nome}
            <Dica rotulo="Como se medem as medidas do prédio">
              Em metros. O que não se souber fica em branco — por medir —, e o levantamento trata disso. Nada se calcula a partir das áreas
              das zonas. A altura é o número de pisos vezes o pé-direito.
            </Dica>
          </div>
          <p className="text-[15px] text-slate-600">
            {factos}
            {altura && <span className="whitespace-nowrap tabular-nums"> · altura {altura}</span>}
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          {campo('largura', 'Frente')}
          {campo('profundidade', 'Fundo')}
          {campo('peDireito', 'Pé-direito')}
          <div className="w-[11rem]">
            <label htmlFor="predio-origem" className="block text-[15px] text-slate-600">
              De onde vêm
            </label>
            <select id="predio-origem" name="origem" value={medidas.origem} onChange={muda('origem')} className="campo mt-1 bg-white">
              {Object.entries(ORIGEM_DAS_MEDIDAS).map(([v, r]) => (
                <option key={v} value={v}>
                  {r}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" disabled={pending} aria-label="Guardar as medidas do prédio" className="btn-secondary btn-sm">
            Guardar
          </button>
        </div>
      </div>
      {erros.length > 0 && (
        <p className="text-[15px] text-amber-800" role="alert">
          {erros.join(' ')}
        </p>
      )}
      <EstadoDeGravacao pending={pending} ok={state.ok} mensagem={state.message} repetir={repetir} />
    </form>
  );
}
