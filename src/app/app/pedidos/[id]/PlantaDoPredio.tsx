'use client';

import { useState } from 'react';
import { FORMAS, FORMA_LABELS, footprintPlan, type Forma } from '@/domain/volume';

/**
 * A planta do prédio, no passo 2 (06/11/2026): quadrado, I, L, U ou T — as mesmas cinco do cadastro do prédio.
 *
 * O desenho começa por ser uma laje, um painel com a frente do primeiro alçado, e só ganha planta quando entra
 * o **segundo** alçado: é aí que cada um passa a ocupar o seu lado. Por isso a pergunta só aparece nesse
 * momento, e só se o prédio ainda não disser qual é — com a forma do cadastro, o desenho usa-a logo e esta
 * linha só a mostra, com «Alterar». Enquanto ninguém escolher, o desenho usa a banda: a escolha não bloqueia nada.
 *
 * Cinco botões com a miniatura da planta vista de cima; o escolhido fica marcado (`aria-pressed`).
 */

function Miniatura({ forma }: { forma: Forma }) {
  const rects = footprintPlan(forma);
  const w = Math.max(...rects.map((r) => r[2]));
  const h = Math.max(...rects.map((r) => r[3]));
  return (
    <svg viewBox={`-1 -1 ${w + 2} ${h + 2}`} width="34" height="24" aria-hidden="true" className="shrink-0">
      {rects.map(([x0, y0, x1, y1], i) => (
        <rect key={i} x={x0} y={y0} width={x1 - x0} height={y1 - y0} className="fill-tinta-100 stroke-tinta-700" strokeWidth={0.6} />
      ))}
    </svg>
  );
}

export function PlantaDoPredio({
  forma,
  porEscolher,
  podeEscolher,
  aoEscolher,
  aGuardar,
  erro,
}: {
  /** A planta de agora: a do prédio, ou nula enquanto ninguém a escolheu. */
  forma: Forma | null;
  /** Há dois alçados ou mais e o prédio ainda não diz a planta: é altura de perguntar. */
  porEscolher: boolean;
  podeEscolher: boolean;
  aoEscolher: (forma: Forma) => void;
  aGuardar: boolean;
  erro: string | null;
}) {
  const [aAlterar, setAAlterar] = useState(false);
  const aberta = podeEscolher && (porEscolher || aAlterar);

  return (
    <div className="mb-3 rounded-2xl bg-slate-50 px-4 py-3">
      {porEscolher ? (
        <div>
          <p className="text-[17px] font-medium text-tinta-900">Qual é a planta do prédio?</p>
          <p className="text-[15px] text-slate-600">
            Cada alçado fica no seu lado.{podeEscolher ? ' Até escolher, o desenho usa uma banda.' : ' A planta ainda está por escolher.'}
          </p>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
          <p className="flex items-center gap-2.5 text-[15px] text-slate-700">
            {forma && <Miniatura forma={forma} />}
            <span>
              Planta: <span className="font-medium text-tinta-900">{forma ? FORMA_LABELS[forma] : 'por escolher'}</span>
            </span>
          </p>
          {podeEscolher && (
            <button type="button" onClick={() => setAAlterar((a) => !a)} aria-expanded={aAlterar} className="btn-quiet btn-sm">
              {aAlterar ? 'Fechar' : 'Alterar'}
            </button>
          )}
        </div>
      )}
      {aberta && (
        <div role="group" aria-label="Planta do prédio" className="mt-2 flex flex-wrap gap-2">
          {FORMAS.map((f) => (
            <button
              key={f}
              type="button"
              disabled={aGuardar}
              aria-pressed={forma === f}
              onClick={() => {
                aoEscolher(f);
                setAAlterar(false);
              }}
              className={`btn-secondary btn-sm gap-2 ${forma === f ? 'border-tinta-600 bg-tinta-50 font-medium text-tinta-900' : ''}`}
            >
              <Miniatura forma={f} />
              {FORMA_LABELS[f]}
            </button>
          ))}
        </div>
      )}
      {erro && (
        <p role="alert" className="mt-2 text-[15px] text-amber-800">
          {erro}
        </p>
      )}
    </div>
  );
}
