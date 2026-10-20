'use client';

import { useState } from 'react';
import { clientGuarantee, effectiveRate, painterFee } from '@/domain/commission';
import { euros, formatEuros } from '@/domain/money';
import { CURRENT_RULES } from '@/domain/rules';

function parseEuros(text: string): number | null {
  const normalized = text.replace(/\s/g, '').replace(/\./g, '').replace(',', '.');
  const value = Number(normalized);
  return Number.isFinite(value) && value >= 0 ? value : null;
}

export function FeeSimulator() {
  const [value, setValue] = useState('100000');
  const base = parseEuros(value);
  const valid = base !== null;

  const baseCents = valid ? euros(base) : 0;
  const fee = painterFee(baseCents, CURRENT_RULES);
  const guarantee = clientGuarantee(baseCents, CURRENT_RULES);
  const rate = effectiveRate(baseCents, CURRENT_RULES);

  return (
    <div className="rounded-2xl border border-slate-200 p-6 shadow-sm">
      <div className="max-w-sm">
        <label className="block text-sm font-medium text-slate-700">
          Valor da obra, sem IVA (€)
          <input
            inputMode="decimal"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-base"
          />
        </label>
      </div>

      {valid ? (
        <dl className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl bg-slate-50 p-4">
            <dt className="text-sm font-semibold text-slate-900">Cliente deposita a caução</dt>
            <dd className="mt-1 text-2xl font-semibold">{formatEuros(guarantee)}</dd>
            <dd className="mt-1 text-sm text-slate-600">
              Garantia de interesse, devolvida quando as duas partes assinam o contrato. Mínimo de{' '}
              {formatEuros(CURRENT_RULES.guaranteeMinCents)}. O adiantamento, se houver, é combinado e pago entre as partes.
            </dd>
          </div>
          <div className="rounded-xl bg-tinta-50 p-4">
            <dt className="text-sm font-semibold text-slate-900">Pintor paga para assinar</dt>
            <dd className="mt-1 text-2xl font-semibold">{formatEuros(fee.gross)}</dd>
            <dd className="mt-1 text-sm text-slate-600">
              Comissão de {formatEuros(fee.net)} ({(rate * 100).toLocaleString('pt-PT', { maximumFractionDigits: 1 })}
              %) mais {formatEuros(fee.vat)} de IVA. Mínimo de {formatEuros(CURRENT_RULES.commissionMinCents)}, sem
              teto.
            </dd>
          </div>
        </dl>
      ) : (
        <p className="mt-6 text-sm text-red-700">Indique um valor válido.</p>
      )}
    </div>
  );
}
