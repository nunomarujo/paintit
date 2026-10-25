'use client';

import { useState } from 'react';
import type { FormState } from '@/app/app/actions';
import { useFormAction } from '@/components/useFormAction';
import { DIA_NORMAL, formatHoras, resumoDoDia, type Presenca } from '@/domain/dayLog';
import { avisoAnual, suplementaresDe, type TipoDia } from '@/domain/overtime';
import { registerDay } from '@/app/app/obras/actions';

const passo = 50; // meia hora

/**
 * Registar o dia. Toda a disciplina deste ecrã está em pedir só as excepções: quem não faltou
 * ninguém e trabalhou o dia todo faz dois toques — abrir e guardar.
 *
 * É a maior aposta do desenho das ferramentas de obra. Se não for usado duas semanas seguidas, a
 * margem real nunca aparece, e vale a pena saber isso cedo (docs/DECISOES.md, 25/10/2026).
 */
export function DayLog({
  worksiteId,
  equipa,
  hoje,
}: {
  worksiteId: string;
  /** `suplementaresNoAno` é o acumulado de cada pessoa antes de hoje, para o aviso das 100 horas. */
  equipa: { id: string; nome: string; suplementaresNoAno: number }[];
  hoje: string;
}) {
  const [presencas, setPresencas] = useState<Presenca[]>(equipa.map((m) => ({ memberId: m.id, nome: m.nome, horas: DIA_NORMAL })));
  const [tipoDia, setTipoDia] = useState<TipoDia>('util');
  const [extras, setExtras] = useState(false);
  const { state, pending, formProps } = useFormAction<FormState>(registerDay.bind(null, worksiteId), { errors: {} });

  const mudar = (id: string, horas: number) =>
    setPresencas((p) => p.map((x) => (x.memberId === id ? { ...x, horas: Math.max(0, Math.min(2400, horas)) } : x)));

  if (equipa.length === 0) {
    return (
      <p className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
        Para registar o dia é preciso ter alguém na equipa desta obra. Acrescente no separador Equipa e horas.
      </p>
    );
  }

  const msg = Object.values(state.errors)[0] ?? state.message;

  return (
    <form {...formProps} className="space-y-4">
      <input type="hidden" name="tipoDia" value={tipoDia} />
      <div className="flex flex-wrap items-end gap-4">
        <label className="block text-sm">
          Dia
          <input type="date" name="data" defaultValue={hoje} className="mt-1 block rounded-lg border border-slate-300 bg-white px-3 py-2" />
        </label>
        <label className="flex items-center gap-2 pb-2 text-sm text-slate-700">
          <input type="checkbox" checked={tipoDia === 'descanso'} onChange={(e) => setTipoDia(e.target.checked ? 'descanso' : 'util')} />
          Dia de descanso ou feriado
        </label>
      </div>
      {tipoDia === 'descanso' && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[12.5px] text-amber-900">
          Em dia de descanso ou feriado não há horas normais: todas as horas levam acréscimo, e é isso que vai contar
          no custo da obra.
        </p>
      )}

      <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
        {presencas.map((p) => {
          const faltou = p.horas === 0;
          return (
            <li key={p.memberId} className="flex items-start justify-between gap-3 px-4 py-2.5">
              <span className="min-w-0 flex-1">
                <span className={`block text-sm font-medium ${faltou ? 'text-slate-400 line-through' : 'text-slate-900'}`}>{p.nome}</span>
                {(() => {
                  const extra = suplementaresDe({ horas: p.horas, tipoDia });
                  const membro = equipa.find((m) => m.id === p.memberId);
                  const aviso = avisoAnual((membro?.suplementaresNoAno ?? 0) + extra);
                  if (extra === 0 && !aviso) return null;
                  return (
                    <span className="block text-[11.5px] leading-snug text-amber-800">
                      {extra > 0 ? `${formatHoras(extra)} h a mais` : ''}
                      {extra > 0 && aviso ? ' · ' : ''}
                      {aviso ?? ''}
                    </span>
                  );
                })()}
              </span>
              <input type="hidden" name={`horas:${p.memberId}`} value={formatHoras(p.horas).replace('.', ',')} />
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => mudar(p.memberId, p.horas - passo)}
                  aria-label={`Menos meia hora a ${p.nome}`}
                  className="h-8 w-8 rounded-lg border border-slate-300 bg-white text-slate-700"
                >
                  −
                </button>
                <span className="w-14 text-center text-sm tabular-nums">{faltou ? '—' : `${formatHoras(p.horas)} h`}</span>
                <button
                  type="button"
                  onClick={() => mudar(p.memberId, p.horas + passo)}
                  aria-label={`Mais meia hora a ${p.nome}`}
                  className="h-8 w-8 rounded-lg border border-slate-300 bg-white text-slate-700"
                >
                  +
                </button>
                <button
                  type="button"
                  onClick={() => mudar(p.memberId, faltou ? DIA_NORMAL : 0)}
                  className="ml-1 text-[12px] text-slate-500 underline underline-offset-4 hover:text-slate-700"
                >
                  {faltou ? 'esteve' : 'faltou'}
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      {!extras ? (
        <button type="button" onClick={() => setExtras(true)} className="text-[12px] text-slate-500 underline underline-offset-4 hover:text-slate-700">
          Acrescentar nota ou custo do dia
        </button>
      ) : (
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="text-sm sm:col-span-3">
            Nota do dia (opcional)
            <input name="nota" placeholder="Choveu de manhã, só se pintou o alçado sul" className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2" />
          </label>
          <label className="text-sm sm:col-span-2">
            Custo do dia (opcional)
            <input name="custoDescricao" placeholder="Tinta comprada a caminho" className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2" />
          </label>
          <label className="text-sm">
            Valor (€)
            <input name="custo" inputMode="decimal" placeholder="0,00" className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-right" />
          </label>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className="btn-primary">
          {pending ? 'A guardar…' : 'Guardar o dia'}
        </button>
        <span className="text-[13px] text-slate-600">{resumoDoDia(presencas)}</span>
      </div>
      {msg && <p className="text-[12px] text-slate-600">{msg}</p>}
      <p className="text-[11.5px] text-slate-500">
        Registar o mesmo dia outra vez substitui o que lá estava, não soma.
      </p>
    </form>
  );
}
