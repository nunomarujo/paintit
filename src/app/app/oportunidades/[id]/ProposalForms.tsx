'use client';

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
  VAT_RATES_BPS,
  type ProposalTerms,
} from '@/domain/proposal';
import { SURFACE_KIND_LABELS, type SurfaceKind } from '@/domain/request';

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
          hint="Até 30%. Fica guardado até à assinatura."
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
          label="Garantia da obra (anos)"
          inputMode="numeric"
          error={e.garantiaAnos}
          defaultValue={terms.garantiaAnos?.toString() ?? ''}
        />
      </div>
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

export function LineForm({
  proposalId,
  requestId,
  surfaces,
  products,
}: {
  proposalId: string;
  requestId: string;
  surfaces: SurfaceKind[];
  products: string[];
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
        <Field name="superficie" label="Superfície do pedido" error={e.superficie}>
          <select name="superficie" defaultValue={surfaces[0] ?? ''} className={selectClass}>
            <option value="">Geral</option>
            {[...new Set(surfaces)].map((s) => (
              <option key={s} value={s}>
                {SURFACE_KIND_LABELS[s]}
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
      <Field name="produto" label="Produto" error={e.produto} hint="Opcional. Escolha do catálogo ou escreva marca e referência.">
        <input name="produto" list="catalogo-produtos" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-base" />
      </Field>
      <datalist id="catalogo-produtos">
        {products.map((p) => (
          <option key={p} value={p} />
        ))}
      </datalist>
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
