'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { FormState } from '@/app/app/actions';
import { applyTemplate, deleteTemplate, saveTemplate } from '@/app/app/oportunidades/orcamento-actions';
import { BudgetContext, outcome, type StepSaver } from './BudgetContext';
import { BudgetSteps } from './BudgetSteps';
import { STEP_IDS, STEP_LABELS, type StepId } from './steps';

export interface TemplateOption {
  id: string;
  nome: string;
  /** Resumo curto: "5 trabalhos". */
  resumo: string;
}

const input = 'rounded-lg border border-slate-300 bg-white px-3 py-2 text-base';

/**
 * Mantém os quatro passos montados ao mesmo tempo: andar entre separadores não apaga nada. O passo que se deixa é
 * guardado sozinho; se o guardar falhar, a pessoa avança na mesma e vê o aviso. Em cima, os métodos de trabalho.
 */
export function BudgetShell({
  proposalId,
  requestId,
  initial,
  done,
  steps,
  templates,
  hasWork,
}: {
  proposalId: string;
  requestId: string;
  initial: StepId;
  done: Record<StepId, boolean>;
  steps: Record<StepId, ReactNode>;
  templates: TemplateOption[];
  hasWork: boolean;
}) {
  const router = useRouter();
  const [step, setStep] = useState<StepId>(initial);
  const [warning, setWarning] = useState<string | null>(null);
  const [notice, setNotice] = useState<FormState | null>(null);
  const [busy, setBusy] = useState(false);
  const savers = useRef(new Map<StepId, StepSaver>());
  const stepRef = useRef(step);
  stepRef.current = step;
  const leaving = useRef(false);

  const register = useCallback((id: StepId, saver: StepSaver) => {
    savers.current.set(id, saver);
    return () => {
      if (savers.current.get(id) === saver) savers.current.delete(id);
    };
  }, []);

  /** Guarda os passos com alterações; devolve as mensagens de quem falhou. */
  const saveDirty = useCallback(async (only?: StepId) => {
    const problems: string[] = [];
    let saved = false;
    for (const id of STEP_IDS) {
      if (only && id !== only) continue;
      const s = savers.current.get(id);
      if (!s?.dirty()) continue;
      const error = await s.save();
      if (error) problems.push(`${STEP_LABELS[id]}: ${error}`);
      else saved = true;
    }
    return { problems, saved };
  }, []);

  const go = useCallback(
    async (next: StepId) => {
      const from = stepRef.current;
      if (next === from) return;
      const { problems, saved } = await saveDirty(from);
      setWarning(problems.length ? `Alterações não guardadas (${problems.join(' ')}). Mantêm-se no ecrã; corrija-as para as guardar.` : null);
      setStep(next);
      window.history.replaceState(null, '', `?passo=${next}`);
      // O que se guardou muda os totais, as pendências e a folha de revisão.
      if (saved) router.refresh();
      window.scrollTo({ top: 0 });
    },
    [router, saveDirty],
  );

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (leaving.current) return;
      if ([...savers.current.values()].some((s) => s.dirty())) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, []);

  const api = useMemo(() => ({ register, go }), [register, go]);

  const [picked, setPicked] = useState(templates[0]?.id ?? '');
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState('');
  const chosen = templates.find((t) => t.id === picked) ?? templates[0] ?? null;

  async function run(job: () => Promise<FormState>, reload = false) {
    setBusy(true);
    setNotice(null);
    const r = await job();
    outcome(r);
    setNotice(r);
    setBusy(false);
    if (r.ok) {
      if (reload) {
        leaving.current = true;
        window.location.reload();
      } else router.refresh();
    }
    return r;
  }

  async function apply() {
    if (!chosen) return;
    if (hasWork && !window.confirm('Aplicar o método substitui os trabalhos e as condições deste rascunho. Continuar?')) return;
    await run(() => applyTemplate(proposalId, requestId, chosen.id), true);
  }

  async function saveAs() {
    const { problems } = await saveDirty();
    if (problems.length) {
      setNotice({ errors: {}, message: `Corrija primeiro: ${problems.join(' ')}` });
      return;
    }
    const r = await run(() => saveTemplate(proposalId, requestId, name));
    if (r.ok) {
      setNaming(false);
      setName('');
    }
  }

  async function remove() {
    if (!chosen || !window.confirm(`Apagar o método “${chosen.nome}”?`)) return;
    await run(() => deleteTemplate(requestId, chosen.id));
  }

  return (
    <BudgetContext.Provider value={api}>
      <section className="rounded-2xl border border-slate-200 bg-white p-4" aria-label="Métodos de trabalho">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">Método de trabalho</p>
            <p className="text-sm text-slate-600">
              {templates.length > 0
                ? 'Começar por um método guardado: os trabalhos, os produtos, os preços e as condições habituais.'
                : 'Depois de preparar um orçamento, guarde-o como método para o reutilizar nos próximos.'}
            </p>
          </div>
          {templates.length > 0 && (
            <>
              <label className="sr-only" htmlFor="metodo">Método guardado</label>
              <select id="metodo" value={chosen?.id ?? ''} onChange={(e) => setPicked(e.target.value)} className={input}>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nome} ({t.resumo})
                  </option>
                ))}
              </select>
              <button type="button" disabled={busy} onClick={apply} className="btn-primary">
                Aplicar
              </button>
              <button type="button" disabled={busy} onClick={remove} className="text-sm text-red-700 hover:underline">
                Apagar
              </button>
            </>
          )}
          {!naming && (
            <button type="button" disabled={busy} onClick={() => setNaming(true)} className="btn-secondary">
              Guardar como método…
            </button>
          )}
        </div>
        {naming && (
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <label className="text-sm font-medium text-slate-700">
              Nome do método
              <input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder="Ex.: Fachada com lavagem e fissuras" className={`mt-1 block w-80 max-w-full ${input}`} />
            </label>
            <button type="button" disabled={busy || !name.trim()} onClick={saveAs} className="btn-primary">
              {busy ? 'A guardar…' : 'Guardar método'}
            </button>
            <button type="button" onClick={() => setNaming(false)} className="text-sm text-slate-600 hover:underline">
              Cancelar
            </button>
            <p className="basis-full text-xs text-slate-500">Com o mesmo nome de um método existente, este é substituído. Zonas e quantidades não se guardam: vêm do pedido de cada cliente.</p>
          </div>
        )}
        {notice && (
          <p className={`mt-3 text-sm ${notice.ok ? 'text-tinta-700' : 'text-red-700'}`} role="status">
            {notice.message ?? Object.values(notice.errors)[0]}
          </p>
        )}
      </section>

      <BudgetSteps current={step} done={done} onSelect={go} />
      {warning && (
        <p className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900" role="alert">
          {warning}
        </p>
      )}
      {STEP_IDS.map((id) => (
        <div key={id} hidden={id !== step} className="space-y-4">
          {steps[id]}
        </div>
      ))}
    </BudgetContext.Provider>
  );
}
