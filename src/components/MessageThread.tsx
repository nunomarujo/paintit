'use client';

import { useActionState, useEffect, useRef } from 'react';
import type { FormState } from '@/app/app/actions';
import { sendMessage } from '@/app/app/oportunidades/actions';

export interface Message {
  id: string;
  lado: 'cliente' | 'pintor';
  texto: string;
  created_at: string;
}

/** Conversa entre cliente e pintor sobre uma proposta, sem contactos até à apresentação. */
export function MessageThread({
  proposalId,
  side,
  path,
  messages,
  canWrite,
  otherLabel,
}: {
  proposalId: string;
  side: 'cliente' | 'pintor';
  path: string;
  messages: Message[];
  canWrite: boolean;
  otherLabel: string;
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(sendMessage.bind(null, proposalId, side, path), {
    errors: {},
  });
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  return (
    <div className="space-y-3 text-sm">
      {messages.length === 0 ? (
        <p className="text-slate-600">Sem mensagens.</p>
      ) : (
        <ul className="space-y-2">
          {messages.map((m) => (
            <li
              key={m.id}
              className={`max-w-[85%] rounded-xl px-3 py-2 ${
                m.lado === side ? 'ml-auto bg-tinta-50' : 'bg-slate-100'
              }`}
            >
              <p className="text-xs text-slate-500">
                {m.lado === side ? 'Eu' : otherLabel} · {new Date(m.created_at).toLocaleString('pt-PT', { timeZone: 'Europe/Lisbon' })}
              </p>
              <p className="whitespace-pre-line">{m.texto}</p>
            </li>
          ))}
        </ul>
      )}
      {canWrite && (
        <form ref={formRef} action={action} className="space-y-2">
          <textarea
            name="texto"
            rows={2}
            maxLength={2000}
            placeholder="Pergunta ou esclarecimento técnico. Sem contactos, nomes ou moradas."
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
          />
          {(state.errors.texto || state.message) && (
            <p className="text-red-700" role="alert">
              {state.errors.texto ?? state.message}
            </p>
          )}
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg border border-slate-300 px-4 py-1.5 font-semibold hover:bg-slate-50 disabled:opacity-60"
          >
            {pending ? 'A enviar…' : 'Enviar'}
          </button>
        </form>
      )}
    </div>
  );
}
