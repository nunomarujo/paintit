'use client';

import { useEffect, useRef, useState } from 'react';
import type { StrikeInfo } from '@/domain/strikes';

/**
 * Janela de aviso por tentar partilhar contactos (1.º aviso, último aviso, conta bloqueada).
 * Ouve o evento enviado por useFormAction quando uma ação devolve `strike`.
 */
export function StrikeDialog() {
  const [info, setInfo] = useState<StrikeInfo | null>(null);
  const button = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const on = (e: Event) => setInfo((e as CustomEvent<StrikeInfo>).detail);
    window.addEventListener('qp:strike', on);
    return () => window.removeEventListener('qp:strike', on);
  }, []);
  useEffect(() => {
    if (info) button.current?.focus();
  }, [info]);

  if (!info) return null;
  const blocked = info.level === 'bloqueada';
  const tone = blocked || info.level === 'ultimo' ? 'border-red-300' : 'border-amber-300';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" role="alertdialog" aria-modal="true" aria-labelledby="strike-title" aria-describedby="strike-text">
      <div className={`w-full max-w-md rounded-2xl border-2 bg-white p-6 shadow-xl ${tone}`}>
        <p className={`text-xs font-bold uppercase tracking-[0.18em] ${blocked || info.level === 'ultimo' ? 'text-red-700' : 'text-amber-700'}`}>
          Aviso {info.n} de {info.max}
        </p>
        <h2 id="strike-title" className="mt-1 text-xl font-semibold">
          {info.titulo}
        </h2>
        <p id="strike-text" className="mt-3 text-sm text-slate-700">
          {info.texto}
        </p>
        <div className="mt-5 flex justify-end">
          {blocked ? (
            <a href="/conta-bloqueada" className="btn-primary">
              Continuar
            </a>
          ) : (
            <button ref={button} type="button" onClick={() => setInfo(null)} className="btn-primary">
              Compreendi
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
