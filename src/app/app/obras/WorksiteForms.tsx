'use client';

import { useState } from 'react';
import type { FormState } from '@/app/app/actions';
import { MiniForm } from '@/components/MiniForm';
import { createWorksite } from './actions';

/**
 * Criar uma obra própria. Fica escondido atrás de um botão porque a lista é o que interessa ver; o
 * formulário pede o mínimo — um nome basta, o resto acrescenta-se depois dentro da obra.
 */
export function CreateWorksite() {
  const [aberto, setAberto] = useState(false);
  if (!aberto) {
    return (
      <button type="button" onClick={() => setAberto(true)} className="btn-secondary">
        Acrescentar uma obra
      </button>
    );
  }
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="eyebrow">Obra nova</p>
        <button type="button" onClick={() => setAberto(false)} className="text-[15px] text-slate-500 underline underline-offset-4">
          Fechar
        </button>
      </div>
      <MiniForm
        action={createWorksite as (s: FormState, f: FormData) => Promise<FormState>}
        fields={[
          { name: 'nome', label: 'Nome da obra', placeholder: 'Rua das Flores, 12', wide: true },
          { name: 'cliente', label: 'Cliente (opcional)', placeholder: 'Condomínio do n.º 12' },
          { name: 'local', label: 'Local (opcional)', placeholder: 'Viana do Castelo' },
          { name: 'valor', label: 'Valor sem IVA (opcional)', placeholder: '8 400,00' },
          { name: 'inicio', label: 'Início (opcional)', type: 'date' },
        ]}
        submit="Criar obra"
      />
    </div>
  );
}
