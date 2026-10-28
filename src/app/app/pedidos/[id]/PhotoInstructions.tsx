'use client';

import { useEffect, useRef } from 'react';
import { ICONES } from '@/components/NavIcons';

/**
 * Instruções de fotografia do levantamento ("fotos originais" — o nome que o promotor usa para as
 * fotografias tiradas na visita, 24/10/2026). Pouco texto, e cada regra com um desenho ao lado: quem
 * está na obra, de telemóvel na mão, não lê parágrafos.
 *
 * As duas regras que importam, e porquê:
 * - **enquadramento**: uma zona que represente o estado geral (2-5 m² chegam), mais fotos próximas de
 *   cada anomalia — é com isto que o pintor consegue orçamentar sem lá ir;
 * - **nada que identifique o prédio** (números de porta, portas, placas de rua): o anonimato até à
 *   apresentação é regra da plataforma (CLAUDE.md, regra 6), e uma fotografia que mostre a morada
 *   deita-o abaixo sozinha.
 */
export function PhotoInstructions() {
  const ref = useRef<HTMLDialogElement>(null);

  // Fechar com Escape é nativo do <dialog>; isto só garante que o diálogo não fica aberto se o
  // componente sair do ecrã entretanto.
  useEffect(() => {
    const el = ref.current;
    return () => el?.close();
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => ref.current?.showModal()}
        className="rounded-lg border border-tinta-600 px-3 py-1.5 text-sm font-semibold text-tinta-700 hover:bg-tinta-50"
      >
        Instruções das fotografias
      </button>

      <dialog
        ref={ref}
        className="w-[min(34rem,92vw)] rounded-2xl p-0 backdrop:bg-slate-900/40"
        aria-labelledby="instrucoes-fotos-titulo"
      >
        <div className="space-y-5 p-6">
          <div className="flex items-start justify-between gap-4">
            <h2 id="instrucoes-fotos-titulo" className="text-lg font-semibold">
              Como fotografar a obra
            </h2>
            <button
              type="button"
              onClick={() => ref.current?.close()}
              aria-label="Fechar"
              className="rounded-lg px-2 py-1 text-slate-500 hover:bg-slate-100"
            >
              <ICONES.fechar className="h-[18px] w-[18px]" />
            </button>
          </div>

          <Rule
            drawing={<GeneralShot />}
            title="Uma zona que represente o estado da fachada"
            text="2 a 5 m² chegam. Escolha uma zona cujo estado seja o mais parecido com o resto."
          />
          <Rule
            drawing={<CloseUpShot />}
            title="Fotografias próximas de cada anomalia"
            text="Fissuras, humidades, ferrugem, tinta a levantar — tudo o que esteja fora do normal, de perto."
          />
          <Rule
            drawing={<ForbiddenShot />}
            title="Nada que identifique o prédio"
            text="Sem números de porta, portas, placas com nomes de rua, caixas de correio, matrículas ou vizinhos."
            tone="danger"
          />

          <p className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
            A aplicação apaga a localização e a data guardadas dentro do ficheiro. O que ela não consegue
            apagar é o que estiver <em>dentro</em> da imagem — isso depende de si.
          </p>

          <button
            type="button"
            onClick={() => ref.current?.close()}
            className="rounded-lg bg-tinta-600 px-5 py-2 text-sm font-semibold text-white hover:bg-tinta-700"
          >
            Percebi
          </button>
        </div>
      </dialog>
    </>
  );
}

function Rule({ drawing, title, text, tone }: { drawing: React.ReactNode; title: string; text: string; tone?: 'danger' }) {
  return (
    <div className="flex gap-4">
      <div className="shrink-0">{drawing}</div>
      <div>
        <p className={`text-sm font-semibold ${tone === 'danger' ? 'text-red-800' : 'text-slate-800'}`}>{title}</p>
        <p className="mt-0.5 text-sm text-slate-600">{text}</p>
      </div>
    </div>
  );
}

// Desenhos: esquemas simples, não fotografias. Servem para se perceber o enquadramento num relance.
const frame = 'stroke-slate-400';

function GeneralShot() {
  return (
    <svg width="72" height="72" viewBox="0 0 72 72" aria-hidden className="rounded-lg bg-slate-50">
      <rect x="4" y="4" width="64" height="64" rx="4" fill="none" className={frame} strokeWidth="1.5" />
      {/* parede com juntas, e a área escolhida em destaque */}
      <path d="M4 24h64M4 44h64M24 4v64M48 4v64" className="stroke-slate-200" strokeWidth="1" />
      <rect x="18" y="18" width="36" height="32" rx="2" className="fill-tinta-600/15 stroke-tinta-600" strokeWidth="2" />
      <path d="M26 30c4 3 8-2 12 1s8-1 10 2" className="stroke-slate-400" strokeWidth="1.5" fill="none" />
      <text x="36" y="62" textAnchor="middle" className="fill-tinta-700 text-[9px] font-semibold">
        2–5 m²
      </text>
    </svg>
  );
}

function CloseUpShot() {
  return (
    <svg width="72" height="72" viewBox="0 0 72 72" aria-hidden className="rounded-lg bg-slate-50">
      <rect x="4" y="4" width="64" height="64" rx="4" fill="none" className={frame} strokeWidth="1.5" />
      {/* fissura vista de perto */}
      <path d="M20 10c6 10 2 16 8 24s2 14 6 24" className="stroke-slate-700" strokeWidth="2.5" fill="none" />
      <path d="M28 22c4 2 6 0 9 3" className="stroke-slate-500" strokeWidth="1.5" fill="none" />
      {/* mancha de humidade */}
      <ellipse cx="50" cy="48" rx="12" ry="9" className="fill-slate-300/70" />
      <circle cx="50" cy="48" rx="12" r="14" fill="none" className="stroke-tinta-600" strokeWidth="2" strokeDasharray="3 3" />
    </svg>
  );
}

function ForbiddenShot() {
  return (
    <svg width="72" height="72" viewBox="0 0 72 72" aria-hidden className="rounded-lg bg-red-50">
      <rect x="4" y="4" width="64" height="64" rx="4" fill="none" className="stroke-red-300" strokeWidth="1.5" />
      {/* porta com número e placa de rua */}
      <rect x="14" y="26" width="20" height="34" rx="2" className="fill-white stroke-red-400" strokeWidth="1.5" />
      <circle cx="30" cy="44" r="1.6" className="fill-red-400" />
      <rect x="18" y="30" width="12" height="7" rx="1" className="fill-red-100 stroke-red-400" strokeWidth="1" />
      <text x="24" y="36" textAnchor="middle" className="fill-red-700 text-[6px] font-bold">
        14
      </text>
      <rect x="42" y="18" width="20" height="9" rx="1" className="fill-white stroke-red-400" strokeWidth="1.5" />
      <path d="M46 23h12" className="stroke-red-400" strokeWidth="1.5" />
      {/* risco por cima */}
      <path d="M10 62 62 10" className="stroke-red-600" strokeWidth="3.5" strokeLinecap="round" />
    </svg>
  );
}
