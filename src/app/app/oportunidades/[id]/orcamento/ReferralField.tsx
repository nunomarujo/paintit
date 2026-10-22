'use client';

import { useState } from 'react';
import { applyReferral } from '@/app/app/oportunidades/orcamento-actions';

interface LinkedSupplier {
  id: string;
  code: string;
  nome: string;
}

/** Fornecedor associado a esta obra, para efeitos da comissão por volume do fornecedor (src/domain/referral.ts).
 * O desconto do pintor já conta todos os fornecedores ligados e ativos, nesta e em todas as propostas — escolher
 * aqui não o muda; só diz qual fornecedor fica associado a ESTA obra. */
export function ReferralField({
  proposalId,
  requestId,
  linkedSuppliers,
  appliedCodeId,
}: {
  proposalId: string;
  requestId: string;
  linkedSuppliers: LinkedSupplier[];
  appliedCodeId: string | null;
}) {
  const [addingNew, setAddingNew] = useState(linkedSuppliers.length === 0);
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function run(value: string) {
    setBusy(true);
    const r = await applyReferral(proposalId, requestId, value);
    setBusy(false);
    setMsg({ ok: !!r.ok, text: r.message ?? 'Não foi possível aplicar o código.' });
    if (r.ok) {
      setCode('');
      if (value) setAddingNew(false);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6" aria-labelledby="codigo-fornecedor">
      <h3 id="codigo-fornecedor" className="font-semibold">
        Fornecedor associado a esta obra
      </h3>
      <p className="mt-1 text-sm text-slate-600">
        Se ganhar a obra, o fornecedor que indicar aqui soma-a às suas. Não muda nada no que paga: o seu desconto por fornecedores com código ligado já conta
        todos, em todas as obras, enquanto o código estiver ativo — não precisa de voltar a aplicá-lo.
      </p>

      {!addingNew && linkedSuppliers.length > 0 && (
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <label className="text-sm font-medium text-slate-700">
            Fornecedor
            <select
              defaultValue={appliedCodeId ?? ''}
              disabled={busy}
              onChange={(e) => {
                const supplier = linkedSuppliers.find((s) => s.id === e.target.value);
                run(supplier?.code ?? '');
              }}
              className="mt-1 block w-56 rounded-lg border border-slate-300 bg-white px-3 py-2 text-base"
            >
              <option value="">Nenhum</option>
              {linkedSuppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nome}
                </option>
              ))}
            </select>
          </label>
          <button type="button" disabled={busy} onClick={() => setAddingNew(true)} className="text-sm text-slate-600 hover:underline">
            + Novo código de outro fornecedor
          </button>
        </div>
      )}

      {addingNew && (
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
          {linkedSuppliers.length > 0 && (
            <button type="button" disabled={busy} onClick={() => setAddingNew(false)} className="text-sm text-slate-600 hover:underline">
              Cancelar
            </button>
          )}
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
