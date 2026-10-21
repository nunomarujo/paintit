'use client';

import { useState } from 'react';
import { useFormAction } from '@/components/useFormAction';
import type { FormState } from '@/app/app/actions';
import { addLine, saveTerms, submitProposal } from '@/app/app/oportunidades/actions';
import { Field, selectClass } from '@/components/Field';
import {
  INCLUSIONS,
  INCLUSION_LABELS,
  LINE_CATEGORIES,
  LINE_CATEGORY_LABELS,
  UNITS,
  UNIT_LABELS,
  MAX_PHASES,
  VAT_RATES_BPS,
  type PaymentPhase,
  type ProposalTerms,
} from '@/domain/proposal';
import type { MaterialOption } from '@/lib/materials';
import { MaterialPicker } from '@/components/MaterialPicker';

const status = (s: FormState) =>
  s.message && (
    <p className={`text-sm ${s.ok ? 'text-tinta-700' : 'text-red-700'}`} role="status">
      {s.message}
    </p>
  );
const button =
  'rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-50 disabled:opacity-60';
const hundredths = (n: number | null) => (n === null ? '' : (n / 100).toString().replace('.', ','));

export function TermsForm({ proposalId, requestId, terms }: { proposalId: string; requestId: string; terms: ProposalTerms }) {
  const { state, pending, formProps } = useFormAction<FormState>(saveTerms.bind(null, proposalId, requestId), { errors: {} });
  const e = state.errors;
  return (
    <form {...formProps} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <Field name="ivaBps" label="IVA" error={e.ivaBps}>
          <select name="ivaBps" defaultValue={String(terms.ivaBps)} className={selectClass}>
            {VAT_RATES_BPS.map((v) => (
              <option key={v} value={v}>
                {v / 100}%
              </option>
            ))}
          </select>
        </Field>
        <Field name="validade" label="Válida até" type="date" required error={e.validade} defaultValue={terms.validade ?? ''} />
        <Field name="inicioPossivel" label="Início possível" type="date" error={e.inicioPossivel} defaultValue={terms.inicioPossivel ?? ''} />
        <Field
          name="duracaoDias"
          label="Duração estimada (dias)"
          inputMode="numeric"
          required
          error={e.duracaoDias}
          defaultValue={terms.duracaoDias?.toString() ?? ''}
        />
        <Field
          name="adiantamento"
          label="Adiantamento de adjudicação (%)"
          inputMode="numeric"
          error={e.adiantamento}
          hint="Opcional, até 30%. Conta como a primeira parte do plano de pagamentos."
          defaultValue={hundredths(terms.adiantamentoBps || null)}
        />
        <Field
          name="precoAjusteM2"
          label="Preço por m² para correções (€)"
          error={e.precoAjusteM2}
          hint="Aplica-se se a área real for diferente."
          defaultValue={hundredths(terms.precoAjusteM2)}
        />
        <Field
          name="garantiaAnos"
          label="Garantia adicional da obra (anos)"
          inputMode="numeric"
          error={e.garantiaAnos}
          hint="Opcional. A garantia exigida por lei aplica-se sempre e fica indicada na proposta; esta acresce a ela."
          defaultValue={terms.garantiaAnos?.toString() ?? ''}
        />
      </div>
      <PaymentPlan phases={terms.fases} error={e.fases} />
      <fieldset className="space-y-3 rounded-xl bg-slate-50 p-4">
        <legend className="px-1 text-sm font-semibold">Declarações</legend>
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" name="confirmaMaoObra" value="sim" defaultChecked={terms.confirmaMaoObra} className="mt-1" />
          <span>Confirmo que o orçamento inclui mão-de-obra qualificada para a execução proposta.</span>
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field name="seguroRc" label="Seguro de responsabilidade civil" required error={e.seguroRc}>
            <select name="seguroRc" defaultValue={terms.seguroRc ?? ''} className={selectClass}>
              <option value="" disabled>Escolher…</option>
              <option value="sim">Tenho</option>
              <option value="nao">Não tenho</option>
            </select>
          </Field>
          <Field name="seguroAt" label="Seguro de acidentes de trabalho" required error={e.seguroAt}>
            <select name="seguroAt" defaultValue={terms.seguroAt ?? ''} className={selectClass}>
              <option value="" disabled>Escolher…</option>
              <option value="sim">Tenho</option>
              <option value="nao">Não tenho</option>
            </select>
          </Field>
        </div>
        <p className="text-xs text-slate-600">Quem declara não ter seguro pode submeter, mas o cliente vê um aviso a vermelho.</p>
      </fieldset>
      <Field name="exclusoes" label="Exclusões" error={e.exclusoes} hint="O que não está incluído (licenças, ocupação de via…).">
        <textarea name="exclusoes" rows={2} defaultValue={terms.exclusoes} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
      </Field>
      <Field name="notas" label="Notas para o cliente" error={e.notas}>
        <textarea name="notas" rows={3} defaultValue={terms.notas} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
      </Field>
      {status(state)}
      <button type="submit" disabled={pending} className={button}>
        {pending ? 'A guardar…' : 'Guardar condições'}
      </button>
    </form>
  );
}

function PaymentPlan({ phases, error }: { phases: PaymentPhase[]; error?: string }) {
  const [rows, setRows] = useState<{ nome: string; pct: string }[]>(
    phases.length ? phases.map((f) => ({ nome: f.nome, pct: hundredths(f.bps) })) : [{ nome: '', pct: '' }],
  );
  const set = (i: number, k: 'nome' | 'pct', v: string) => setRows((r) => r.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
  return (
    <fieldset className="space-y-3 rounded-xl bg-slate-50 p-4">
      <legend className="px-1 text-sm font-semibold">Plano de pagamentos</legend>
      <p className="text-xs text-slate-600">
        Fases e percentagem do preço de cada uma (por exemplo: ao iniciar, a meio da obra, ao concluir). Com o adiantamento,
        têm de somar 100%. O pagamento da obra é feito diretamente entre as partes.
      </p>
      {rows.map((r, i) => (
        <div key={i} className="grid grid-cols-[1fr_6rem_auto] items-end gap-3">
          <label className="block text-sm font-medium text-slate-700">
            {i === 0 ? 'Fase' : <span className="sr-only">Fase</span>}
            <input name="faseNome" value={r.nome} onChange={(ev) => set(i, 'nome', ev.target.value)} maxLength={60} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-base" placeholder="Ex.: Ao concluir a fachada principal" />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            {i === 0 ? '%' : <span className="sr-only">Percentagem</span>}
            <input name="fasePct" value={r.pct} onChange={(ev) => set(i, 'pct', ev.target.value)} inputMode="decimal" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-base" />
          </label>
          <button type="button" onClick={() => setRows((x) => (x.length > 1 ? x.filter((_, j) => j !== i) : [{ nome: '', pct: '' }]))} className="mb-1 text-sm text-slate-600 hover:underline">
            Remover
          </button>
        </div>
      ))}
      {rows.length < MAX_PHASES && (
        <button type="button" onClick={() => setRows((x) => [...x, { nome: '', pct: '' }])} className={button}>
          Acrescentar fase
        </button>
      )}
      {error && <p className="text-xs text-red-700" role="alert">{error}</p>}
    </fieldset>
  );
}

export function LineForm({
  proposalId,
  requestId,
  zones,
  materials,
}: {
  proposalId: string;
  requestId: string;
  /** Zonas (fachadas) do pedido a que a linha se pode aplicar. */
  zones: { id: string; label: string }[];
  materials: MaterialOption[];
}) {
  const { state, pending, formProps } = useFormAction<FormState>(addLine.bind(null, proposalId, requestId), {
    errors: {},
  }, { resetOnSuccess: true });
  const e = state.errors;
  return (
    <form {...formProps} className="space-y-4">
      <h3 className="text-sm font-semibold">Acrescentar linha</h3>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field name="categoria" label="Categoria" required error={e.categoria}>
          <select name="categoria" defaultValue="pintura" className={selectClass}>
            {LINE_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {LINE_CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
        </Field>
        <Field name="inclusao" label="Preço" error={e.inclusao}>
          <select name="inclusao" defaultValue="incluido" className={selectClass}>
            {INCLUSIONS.map((i) => (
              <option key={i} value={i}>
                {INCLUSION_LABELS[i]}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <fieldset className="rounded-xl bg-slate-50 p-4">
        <legend className="px-1 text-sm font-semibold">Aplicar esta linha a</legend>
        <p className="text-xs text-slate-600">
          Assinale uma, várias ou todas as zonas. Sem nada assinalado, a linha aplica-se à obra toda (por exemplo, andaimes ou mobilização).
        </p>
        <div className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
          {zones.map((z) => (
            <label key={z.id} className="flex items-center gap-2">
              <input type="checkbox" name="zona" value={z.id} />
              {z.label}
            </label>
          ))}
        </div>
        {e.zona && <p className="mt-1 text-xs text-red-700" role="alert">{e.zona}</p>}
        <div className="mt-3">
          <Field
            name="motivoDiferenca"
            label="Motivo da diferença (opcional)"
            error={e.motivoDiferenca}
            hint="Se a linha só se aplica a algumas zonas, explique porquê ao cliente. Ex.: tardoz com fissuras."
          />
        </div>
      </fieldset>
      <Field name="descricao" label="Descrição do trabalho" required error={e.descricao} placeholder="Ex.: pintura com tinta acrílica, 2 demãos" />
      <div className="grid gap-4 sm:grid-cols-4">
        <Field name="quantidade" label="Quantidade" required error={e.quantidade} />
        <Field name="unidade" label="Unidade" error={e.unidade}>
          <select name="unidade" defaultValue="m2" className={selectClass}>
            {UNITS.map((u) => (
              <option key={u} value={u}>
                {UNIT_LABELS[u]}
              </option>
            ))}
          </select>
        </Field>
        <Field name="preco" label="Preço unitário (€)" required error={e.preco} />
        <Field name="demaos" label="Demãos" inputMode="numeric" error={e.demaos} />
      </div>
      <MaterialPicker key={String(state.ok) + (state.message ?? '')} options={materials} />
      {status(state)}
      <button type="submit" disabled={pending} className={button}>
        {pending ? 'A acrescentar…' : 'Acrescentar linha'}
      </button>
    </form>
  );
}

export function SubmitProposal({ proposalId, requestId, blockers }: { proposalId: string; requestId: string; blockers: string[] }) {
  const { state, pending, formProps } = useFormAction<FormState>(submitProposal.bind(null, proposalId, requestId), { errors: {} });
  return (
    <form {...formProps} className="space-y-3">
      {blockers.length > 0 && (
        <div className="rounded-xl bg-amber-50 p-4 text-sm">
          <p className="font-medium">Antes de submeter:</p>
          <ul className="mt-1 list-disc pl-5">
            {blockers.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
        </div>
      )}
      {status(state)}
      <button
        type="submit"
        disabled={pending || blockers.length > 0}
        className="rounded-lg bg-tinta-600 px-5 py-2 font-semibold text-white hover:bg-tinta-700 disabled:opacity-50"
      >
        {pending ? 'A submeter…' : 'Submeter proposta'}
      </button>
    </form>
  );
}
