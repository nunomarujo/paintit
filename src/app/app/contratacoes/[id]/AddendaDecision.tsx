'use client';

import { useState } from 'react';
import type { FormState } from '@/app/app/actions';
import { useFormAction } from '@/components/useFormAction';
import { answerAddenda } from '@/app/app/contratacoes/actions';

/**
 * A resposta do cliente a um trabalho a mais. Aceitar é um clique; recusar abre um campo para dizer
 * porquê, que é o que evita a discussão seguinte.
 */
export function AddendaDecision({ engagementId, addendaId }: { engagementId: string; addendaId: string }) {
  const [recusar, setRecusar] = useState(false);
  const aceitar = useFormAction<FormState>(answerAddenda.bind(null, engagementId, addendaId, 'aceite'), { errors: {} });
  const recusa = useFormAction<FormState>(answerAddenda.bind(null, engagementId, addendaId, 'recusada'), { errors: {} });
  const estado = aceitar.state.message ? aceitar.state : recusa.state;

  if (estado.ok) return <p className="text-[15px] font-semibold text-slate-600">{estado.message}</p>;

  if (recusar) {
    return (
      <form {...recusa.formProps} className="w-full max-w-sm space-y-2">
        <label className="block text-[15px] text-slate-600">
          Porque não aceita? (o pintor vê esta nota)
          <textarea name="nota" rows={2} className="mt-1 campo" />
        </label>
        <div className="flex gap-3">
          <button type="submit" disabled={recusa.pending} className="btn-secondary">
            {recusa.pending ? 'A enviar…' : 'Confirmar a recusa'}
          </button>
          <button type="button" onClick={() => setRecusar(false)} className="text-[15px] text-slate-500 underline underline-offset-4">
            Voltar atrás
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <form {...aceitar.formProps}>
        <button type="submit" disabled={aceitar.pending} className="btn-primary">
          {aceitar.pending ? 'A registar…' : 'Aceitar'}
        </button>
      </form>
      <button type="button" onClick={() => setRecusar(true)} className="text-[15px] text-slate-500 underline underline-offset-4 hover:text-slate-700">
        Não aceitar
      </button>
    </div>
  );
}
