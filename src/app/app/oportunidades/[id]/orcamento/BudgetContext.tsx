'use client';

import { createContext, useContext, useEffect, useRef } from 'react';
import type { FormState } from '@/app/app/actions';
import type { StepId } from './steps';

/** O que cada passo sabe fazer: dizer se tem alterações por guardar e guardá-las (null = guardado). */
export interface StepSaver {
  dirty: () => boolean;
  save: () => Promise<string | null>;
}

interface BudgetApi {
  register: (id: StepId, saver: StepSaver) => () => void;
  go: (step: StepId) => Promise<void>;
}

export const BudgetContext = createContext<BudgetApi | null>(null);

export function useBudget(): BudgetApi {
  const api = useContext(BudgetContext);
  if (!api) throw new Error('useBudget fora do BudgetShell');
  return api;
}

/** Regista o passo no BudgetShell, que o guarda sozinho ao mudar de separador. */
export function useStepSaver(id: StepId, saver: StepSaver) {
  const { register } = useBudget();
  const latest = useRef(saver);
  latest.current = saver;
  useEffect(() => register(id, { dirty: () => latest.current.dirty(), save: () => latest.current.save() }), [register, id]);
}

/** Resposta de uma ação guardada diretamente: mensagem de erro, ou null se correu bem. */
export function outcome(r: FormState): string | null {
  const strike = (r as { strike?: unknown }).strike;
  if (strike) window.dispatchEvent(new CustomEvent('qp:strike', { detail: strike }));
  return r.ok ? null : r.message ?? Object.values(r.errors)[0] ?? 'Não foi possível guardar.';
}
