'use client';

import type { FormState } from '@/app/app/actions';
import { MiniForm } from '@/components/MiniForm';
import { UNIDADE_LABELS, UNIDADES } from '@/domain/worksites';
import { addConsumable, moveConsumable } from '../actions';

export function AddConsumable() {
  return (
    <MiniForm
      action={addConsumable as (s: FormState, f: FormData) => Promise<FormState>}
      fields={[
        { name: 'nome', label: 'Consumível', placeholder: 'Fita de pintor 50 mm' },
        { name: 'unidade', label: 'Unidade', options: UNIDADES.map((u) => ({ value: u, label: UNIDADE_LABELS[u] })) },
        { name: 'minimo', label: 'Avisar abaixo de', placeholder: '10' },
      ]}
      submit="Acrescentar"
    />
  );
}

/** Entrada (compra) ou saída para uma obra. É daqui que sai o stock — não há coluna de stock. */
export function MoveConsumable({ consumableId, obras }: { consumableId: string; obras: { value: string; label: string }[] }) {
  return (
    <MiniForm
      action={moveConsumable.bind(null, consumableId)}
      fields={[
        { name: 'sentido', label: 'Movimento', options: [{ value: 'entrada', label: 'Entrada (compra)' }, { value: 'saida', label: 'Saída para obra' }] },
        { name: 'quantidade', label: 'Quantidade', placeholder: '12' },
        { name: 'obra', label: 'Obra (se saída)', options: obras },
        { name: 'nota', label: 'Nota (opcional)' },
      ]}
      submit="Registar"
    />
  );
}
