'use client';

import { useState } from 'react';
import { applyReferral } from '@/app/app/oportunidades/orcamento-actions';

/** Código de adesão de um fornecedor: aplica-se ao rascunho; a base de dados valida (src/domain/referral.ts). */
export function ReferralField({ proposalId, requestId, applied }: { proposalId: string; requestId: string; applied: boolean }) {
  const [on, setOn] = useState(applied);
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function run(value: string) {
    setBusy(true);
    const r = await applyReferral(proposalId, requestId, value);
    setBusy(false);
    setMsg({ ok: !!r.ok, text: r.message ?? 'Não foi possível aplicar o código.' });
    if (r.ok) {
      setOn(!!r.applied);
      setCode('');
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6" aria-labelledby="codigo-fornecedor">
      <h3 id="codigo-fornecedor" className="font-semibold">
        Código de fornecedor
      </h3>
      <p className="mt-1 text-sm text-slate-600">
        Se um fornecedor de tintas lhe deu um código de adesão, aplique-o aqui. Se ganhar a obra, a comissão da plataforma desce 0,25 pontos percentuais. Por causa do mínimo de 150 €, o desconto só se nota em obras acima de 5 000 €.
      </p>
      {on ? (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <span className="rounded-full bg-tinta-50 px-3 py-1 text-sm font-semibold text-tinta-700">Código aplicado ✓</span>
          <button type="button" disabled={busy} onClick={() => run('')} className="text-sm text-slate-600 hover:underline">
            Retirar
          </button>
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <label className="text-sm font-medium text-slate-700">
            Código
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              maxLength={14}
              autoComplete="off"
              className="mt-1 block w-48 rounded-lg border border-slate-300 px-3 py-2 font-mono text-base tracking-wider"
            />
          </label>
          <button type="button" disabled={busy || code.trim().length < 6} onClick={() => run(code)} className="btn-secondary">
            {busy ? 'A validar…' : 'Aplicar código'}
          </button>
        </div>
      )}
      {msg && (
        <p className={`mt-3 text-sm ${msg.ok ? 'text-tinta-700' : 'text-red-700'}`} role="status">
          {msg.text}
        </p>
      )}
    </section>
  );
}
