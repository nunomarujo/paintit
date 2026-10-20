'use client';

import { useState } from 'react';
import type { FormState } from '@/app/app/actions';
import { deleteOrganization } from '@/app/app/actions';
import { useFormAction } from '@/components/useFormAction';

const WORDS = ['ANDAIME', 'PINCEL', 'DEMAO', 'FACHADA', 'PRIMARIO', 'ROLO', 'ESCADOTE', 'BETUME'];

/** Eliminar a entidade: janela de confirmação que obriga a escrever uma palavra ao acaso. */
export function DeleteOrg({ orgId, nome }: { orgId: string; nome: string }) {
  const [open, setOpen] = useState(false);
  const [word] = useState(() => `${WORDS[Math.floor(Math.random() * WORDS.length)]}-${Math.floor(100 + Math.random() * 900)}`);
  const [typed, setTyped] = useState('');
  const { state, pending, formProps } = useFormAction<FormState>(deleteOrganization.bind(null, orgId), { errors: {} });
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="text-sm font-semibold text-red-700 hover:underline">
        Eliminar entidade
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
          <form {...formProps} className="w-full max-w-md space-y-4 rounded-2xl bg-white p-6 text-sm">
            <h2 className="text-lg font-semibold text-red-800">Eliminar “{nome}”</h2>
            <p>
              Apaga a entidade, os prédios, os rascunhos, os documentos e a equipa. <strong>Não se pode desfazer.</strong> Uma
              entidade com histórico (pedidos publicados, propostas, contratações ou produtos) não pode ser eliminada.
            </p>
            <label className="block">
              Para confirmar, escreva <strong className="font-mono">{word}</strong>
              <input
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                autoComplete="off"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono"
              />
            </label>
            {state.message && <p className="text-red-700">{state.message}</p>}
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setOpen(false)} className="rounded-lg border border-slate-300 px-4 py-2">
                Cancelar
              </button>
              <button
                type="submit"
                disabled={pending || typed.trim().toUpperCase() !== word}
                className="rounded-lg bg-red-700 px-4 py-2 font-semibold text-white disabled:opacity-40"
              >
                Eliminar definitivamente
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
