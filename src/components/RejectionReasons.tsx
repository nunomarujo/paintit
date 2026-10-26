'use client';

import { useState } from 'react';
import { OTHER_REASON } from '@/domain/review';

/**
 * Motivos pré-aprovados para uma rejeição: escolher um preenche o texto (ainda editável); "Outro motivo" limpa o
 * campo para escrever livremente. O campo enviado ao servidor continua a ser só texto (`notas`).
 */
export function RejectionReasons({ reasons, value, onChange }: { reasons: readonly string[]; value: string; onChange: (v: string) => void }) {
  const [picked, setPicked] = useState('');
  return (
    <div className="space-y-2">
      <label className="block text-[17px] font-medium text-slate-700">
        Motivo da rejeição
        <select
          value={picked}
          onChange={(e) => {
            const reason = e.target.value;
            setPicked(reason);
            onChange(reason === OTHER_REASON ? '' : reason);
          }}
          className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-[17px]"
        >
          <option value="">Escolher um motivo…</option>
          {reasons.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
          <option value={OTHER_REASON}>{OTHER_REASON}</option>
        </select>
      </label>
      <textarea
        name="notas"
        rows={2}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Texto que a outra parte vê (pode ajustar o motivo escolhido, ou escrever o seu)"
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-[17px]"
      />
    </div>
  );
}
