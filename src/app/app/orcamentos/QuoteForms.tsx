'use client';

import { useState } from 'react';
import type { FormState } from '@/app/app/actions';
import { MiniForm } from '@/components/MiniForm';
import { useFormAction } from '@/components/useFormAction';
import { QUOTE_TEMPLATES, trabalhosDosModelos } from '@/domain/quoteTemplates';
import { createQuote, removeQuote } from './actions';

/** Visto do cartão de modelo. Desenhado e não um carácter, para ter o mesmo peso em qualquer sistema. */
function Visto() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 8.5 6.5 12 13 4.5" />
    </svg>
  );
}

/**
 * Orçamento novo. O ecrã obriga a escolher de onde parte — modelos ou orçamento anterior — porque um
 * orçamento em branco é precisamente a hora que se quer poupar.
 *
 * Os modelos escolhem-se **aos vários** (27/10/2026). Antes era um só, e uma obra real raramente é
 * uma só coisa: a mesma empreitada leva a fachada por fora e as zonas comuns por dentro, ou a fachada
 * e os muros. Obrigado a escolher um, o pintor ficava a adivinhar qual deles sacrificava — e o que
 * sacrificasse era precisamente o que se ia esquecer de orçamentar.
 */
export function CreateQuote({ anteriores }: { anteriores: { id: string; label: string }[] }) {
  const [origem, setOrigem] = useState<'modelo' | 'duplicar'>('modelo');
  const [modelos, setModelos] = useState<string[]>([QUOTE_TEMPLATES[0]!.code]);
  const [duplicar, setDuplicar] = useState(anteriores[0]?.id ?? '');
  const alternar = (code: string) =>
    setModelos((m) => (m.includes(code) ? m.filter((c) => c !== code) : [...m, code]));
  // A ordem por que foram escolhidos é a ordem por que os capítulos entram, por isso vai tal e qual.
  const capitulos = trabalhosDosModelos(modelos).length;
  const umSo = modelos.length === 1 ? QUOTE_TEMPLATES.find((t) => t.code === modelos[0]) : undefined;

  return (
    <div className="space-y-4">
      {anteriores.length > 0 && (
        <div className="flex gap-2 text-[17px]">
          {(['modelo', 'duplicar'] as const).map((o) => (
            <button
              key={o}
              type="button"
              onClick={() => setOrigem(o)}
              aria-pressed={origem === o}
              className={`rounded-lg border px-3 py-1.5 font-semibold ${
                origem === o ? 'border-tinta-600 bg-tinta-50 text-tinta-800' : 'border-slate-300 bg-white text-slate-600'
              }`}
            >
              {o === 'modelo' ? 'Partir de um modelo' : 'Copiar um orçamento anterior'}
            </button>
          ))}
        </div>
      )}

      {origem === 'modelo' ? (
        <div>
          <p className="mb-2 text-[15px] leading-snug text-slate-600">
            Escolher todos os que se aplicam à obra — por exemplo, a fachada por fora e as zonas comuns por dentro.
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {QUOTE_TEMPLATES.map((t) => {
              const on = modelos.includes(t.code);
              return (
                <button
                  key={t.code}
                  type="button"
                  onClick={() => alternar(t.code)}
                  role="checkbox"
                  aria-checked={on}
                  className={`flex items-start gap-2.5 rounded-xl border p-3 text-left transition-colors ${
                    on ? 'border-tinta-600 bg-tinta-50' : 'border-slate-300 bg-white hover:bg-slate-50'
                  }`}
                >
                  <span
                    aria-hidden
                    className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 ${
                      on ? 'border-tinta-600 bg-tinta-600 text-white' : 'border-slate-400 bg-white'
                    }`}
                  >
                    {on && <Visto />}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[17px] font-semibold text-slate-900">{t.label}</span>
                    <span className="mt-0.5 block text-[15px] leading-snug text-slate-600">{t.quando}</span>
                    <span className="mt-1 block text-[15px] text-slate-500">{t.trabalhos.length} capítulos</span>
                  </span>
                </button>
              );
            })}
          </div>
          {/* O resto da explicação aparece só quando é precisa — com um modelo só, não há nada a
              explicar, e a regra dos capítulos repetidos seria ruído por cima dos cartões. */}
          <p className="mt-2 text-[15px] leading-snug text-slate-600" aria-live="polite">
            {modelos.length === 0
              ? 'Escolher pelo menos um modelo.'
              : modelos.length === 1
                ? `1 modelo, ${capitulos} capítulos no orçamento.`
                : `${modelos.length} modelos, ${capitulos} capítulos: o que é comum aos modelos entra uma vez só. Para separar o exterior do interior com produto e preço próprios, acrescenta-se depois uma linha no orçamento.`}
          </p>
        </div>
      ) : (
        <label className="block text-[17px]">
          Orçamento a copiar
          <select value={duplicar} onChange={(e) => setDuplicar(e.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2">
            {anteriores.map((a) => (
              <option key={a.id} value={a.id}>
                {a.label}
              </option>
            ))}
          </select>
        </label>
      )}

      <MiniForm
        action={createQuote as (s: FormState, f: FormData) => Promise<FormState>}
        hidden={origem === 'modelo' ? { modelos: modelos.join(',') } : { duplicar }}
        fields={[
          { name: 'cliente', label: 'Cliente', placeholder: 'Condomínio da Rua das Flores, 12' },
          { name: 'local', label: 'Local (opcional)', placeholder: 'Viana do Castelo' },
          { name: 'titulo', label: 'Título (opcional)', placeholder: 'Pintura das fachadas', wide: true },
        ]}
        submit={
          origem !== 'modelo'
            ? 'Criar a partir do anterior'
            : modelos.length === 0
              ? 'Escolher pelo menos um modelo'
              : umSo
                ? `Criar a partir de "${umSo.label}"`
                : `Criar com ${modelos.length} modelos`
        }
      />
    </div>
  );
}

/** Botão simples ligado a uma server action, com o estado a aparecer ao lado. */
export function ActionButton({
  action,
  label,
  pendingLabel,
  variant = 'secondary',
}: {
  action: (s: FormState, f: FormData) => Promise<FormState>;
  label: string;
  pendingLabel: string;
  variant?: 'primary' | 'secondary' | 'quiet';
}) {
  const { state, pending, formProps } = useFormAction<FormState>(action, { errors: {} });
  const cls =
    variant === 'primary' ? 'btn-primary' : variant === 'secondary' ? 'btn-secondary' : 'text-[15px] text-slate-500 underline underline-offset-4 hover:text-slate-700';
  return (
    <form {...formProps} className="inline-flex items-center gap-2">
      <button type="submit" disabled={pending} className={cls}>
        {pending ? pendingLabel : label}
      </button>
      {state.message && <span className="text-[15px] text-slate-600">{state.message}</span>}
    </form>
  );
}

/**
 * Apagar um orçamento. Confirma-se num segundo clique, no próprio botão: um diálogo do navegador
 * não se estiliza nem se lê bem no telemóvel, e um orçamento apagado não volta.
 */
export function RemoveQuote({ quoteId, numero }: { quoteId: string; numero: number }) {
  const [confirmar, setConfirmar] = useState(false);
  const { pending, formProps, state } = useFormAction<FormState>(removeQuote.bind(null, quoteId), { errors: {} });
  if (!confirmar) {
    return (
      <button
        type="button"
        onClick={() => setConfirmar(true)}
        className="shrink-0 text-[15px] text-slate-600 underline underline-offset-4 hover:text-red-700"
      >
        Apagar
      </button>
    );
  }
  return (
    <form {...formProps} className="shrink-0 text-right">
      <button type="submit" disabled={pending} className="text-[15px] font-semibold text-red-700 underline underline-offset-4">
        {pending ? 'A apagar…' : `Apagar o #${numero}?`}
      </button>
      <button type="button" onClick={() => setConfirmar(false)} className="ml-2 text-[15px] text-slate-500 underline underline-offset-4">
        Não
      </button>
      {state.message && <p className="mt-1 max-w-[28ch] text-[15px] text-red-700">{state.message}</p>}
    </form>
  );
}
