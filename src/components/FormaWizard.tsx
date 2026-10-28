'use client';

import { useState } from 'react';
import { BuildingVolume } from '@/components/BuildingVolume';
import { formaDaGrelha, formaPorCantos, formaProvavel, type Cantos, type Recorte } from '@/domain/footprint';
import { FORMA_LABELS, footprintPlan, type Forma } from '@/domain/volume';

/** Planta de uma forma, vista de cima, só para confirmar o que foi respondido. */
function Planta({ forma, className }: { forma: Forma; className?: string }) {
  const rects = footprintPlan(forma);
  const w = Math.max(...rects.map((r) => r[2]));
  const h = Math.max(...rects.map((r) => r[3]));
  return (
    <svg viewBox={`-1 -1 ${w + 2} ${h + 2}`} className={className ?? 'h-10 w-full'} role="img" aria-hidden="true">
      {rects.map(([x0, y0, x1, y1], i) => (
        <rect key={i} x={x0} y={y0} width={x1 - x0} height={y1 - y0} className="fill-tinta-100 stroke-tinta-700" strokeWidth={0.4} />
      ))}
    </svg>
  );
}

const LADO = 4;
const vazia = () => Array.from({ length: LADO }, () => Array.from({ length: LADO }, () => false));

/**
 * Forma de implantação do prédio, sem obrigar ninguém a comparar desenhos (decisão de 24/10/2026).
 *
 * Propõe a forma mais provável a partir do que já está declarado e pede só confirmação. Se estiver
 * errada, pergunta quantos cantos tem o prédio — contam-se a andar à volta dele, sem imaginar nada
 * visto de cima. Quem preferir desenha a planta numa grelha.
 */
export function FormaWizard({
  valorInicial,
  fachadasLivres,
  moradia = false,
  pisos = null,
  guardar,
}: {
  valorInicial?: Forma | null;
  fachadasLivres: number | null;
  moradia?: boolean;
  pisos?: number | null;
  guardar?: (forma: Forma) => void | Promise<void>;
}) {
  const [forma, setForma] = useState<Forma>(valorInicial ?? formaProvavel(fachadasLivres, moradia));
  const [confirmada, setConfirmada] = useState(valorInicial !== null && valorInicial !== undefined);
  const [passo, setPasso] = useState<'confirmar' | 'cantos' | 'recorte' | 'grelha'>('confirmar');
  const [grelha, setGrelha] = useState<boolean[][]>(vazia);

  const escolher = (f: Forma) => {
    setForma(f);
    setConfirmada(true);
    setPasso('confirmar');
    void guardar?.(f);
  };

  const responderCantos = (cantos: Cantos) => {
    const f = formaPorCantos(cantos, { fachadasLivres });
    if (f) return escolher(f);
    setPasso(cantos === 8 ? 'recorte' : 'grelha');
  };

  const responderRecorte = (recorte: Recorte) => {
    const f = formaPorCantos(8, { fachadasLivres, recorte });
    if (f) escolher(f);
  };

  const daGrelha = formaDaGrelha(grelha);

  return (
    <section className="rounded-xl border border-slate-200 p-4">
      <h3 className="text-[17px] font-medium">Forma do prédio</h3>

      {passo === 'confirmar' && (
        <div className="mt-2 flex items-center gap-4">
          <div className="w-32 shrink-0">
            <BuildingVolume pisos={pisos} fachadas={fachadasLivres} temVarandas={false} moradia={moradia} forma={forma} angulo={30} className="h-24 w-full" />
            <Planta forma={forma} className="mx-auto h-8 w-12" />
          </div>
          <div>
            <p className="font-medium">{FORMA_LABELS[forma]}</p>
            <p className="text-[17px] text-slate-600">
              {confirmada ? 'Forma guardada.' : 'É esta a forma do prédio? Em cima, visto de fora; em baixo, visto de cima.'}
            </p>
            <div className="mt-2 flex gap-2">
              {!confirmada && (
                <button type="button" onClick={() => escolher(forma)} className="rounded-lg bg-tinta-700 px-3 py-1.5 text-[17px] text-white">
                  Sim, é esta
                </button>
              )}
              <button type="button" onClick={() => setPasso('cantos')} className="rounded-lg border border-slate-300 px-3 py-1.5 text-[17px]">
                {confirmada ? 'Alterar' : 'Não, é outra'}
              </button>
            </div>
          </div>
        </div>
      )}

      {passo === 'cantos' && (
        <div className="mt-2">
          <p className="font-medium">Dando a volta ao prédio, quantos cantos tem?</p>
          <p className="text-[17px] text-slate-600">Contam-se as esquinas, a andar à volta. Um prédio encostado conta também os cantos onde encosta.</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {([4, 6, 8, 'outros'] as Cantos[]).map((c) => (
              <button key={String(c)} type="button" onClick={() => responderCantos(c)} className="rounded-lg border border-slate-300 px-4 py-2 text-[17px] hover:border-tinta-600">
                {c === 'outros' ? 'Outro número' : `${c} cantos`}
              </button>
            ))}
          </div>
        </div>
      )}

      {passo === 'recorte' && (
        <div className="mt-2">
          <p className="font-medium">O recorte ao meio é um pátio aberto ou um corpo que avança?</p>
          <ul className="mt-2 grid grid-cols-2 gap-3 sm:max-w-sm">
            {(
              [
                ['patio', 'U', 'Pátio ou saguão: falta um bocado ao meio'],
                ['avanco', 'T', 'Um corpo avança para fora, ao meio'],
              ] as [Recorte, Forma, string][]
            ).map(([r, f, texto]) => (
              <li key={r}>
                <button type="button" onClick={() => responderRecorte(r)} className="w-full rounded-lg border border-slate-300 p-2 text-left hover:border-tinta-600">
                  <Planta forma={f} className="h-12 w-full" />
                  <span className="mt-1 block text-[15px] text-slate-600">{texto}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {passo === 'grelha' && (
        <div className="mt-2">
          <p className="font-medium">Desenhar a planta</p>
          <p className="text-[17px] text-slate-600">A primeira linha é a da rua. Tocar nos quadrados que o prédio ocupa.</p>
          <div className="mt-2 inline-grid grid-cols-4 gap-0.5">
            {grelha.map((linha, l) =>
              linha.map((on, c) => (
                <button
                  key={`${l}-${c}`}
                  type="button"
                  aria-label={`Linha ${l + 1}, coluna ${c + 1}${on ? ', ocupado' : ''}`}
                  aria-pressed={on}
                  onClick={() =>
                    setGrelha((g) => g.map((linha2, l2) => (l2 === l ? linha2.map((v, c2) => (c2 === c ? !v : v)) : linha2)))
                  }
                  className={`h-11 w-11 rounded-lg ${on ? 'bg-tinta-600' : 'bg-slate-100 hover:bg-slate-200'}`}
                />
              )),
            )}
          </div>
          <p className="mt-2 text-[17px]">
            {daGrelha ? `Corresponde a: ${FORMA_LABELS[daGrelha]}.` : 'Ainda não corresponde a nenhuma das formas disponíveis.'}
          </p>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              disabled={!daGrelha}
              onClick={() => daGrelha && escolher(daGrelha)}
              className="rounded-lg bg-tinta-700 px-3 py-1.5 text-[17px] text-white disabled:bg-slate-300"
            >
              Usar esta forma
            </button>
            <button type="button" onClick={() => setPasso('cantos')} className="rounded-lg border border-slate-300 px-3 py-1.5 text-[17px]">
              Voltar às perguntas
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
