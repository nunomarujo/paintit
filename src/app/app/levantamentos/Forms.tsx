'use client';

import type { FormState } from '@/app/app/actions';
import { ConcelhosPicker } from '@/components/ConcelhosPicker';
import { Field } from '@/components/Field';
import { useFormAction } from '@/components/useFormAction';
import { setSurveyCoverage } from './actions';

const button = 'btn-secondary';
const msg = (s: FormState) => {
  const m = Object.values(s.errors)[0] ?? s.message;
  return m ? (
    <p className={`text-[17px] ${s.ok ? 'text-tinta-700' : 'text-red-700'}`} role="status">
      {m}
    </p>
  ) : null;
};

export function CoverageForm({ orgId, initial }: { orgId: string; initial: string[] }) {
  const { state, pending, formProps } = useFormAction<FormState>(setSurveyCoverage.bind(null, orgId), { errors: {} });
  return (
    <form {...formProps} className="flex flex-wrap items-end gap-3">
      <div className="min-w-64 flex-1">
        <Field name="concelhos" label="Concelhos" hint="Vazio = todo o país.">
          <ConcelhosPicker name="concelhos" defaultValue={initial} />
        </Field>
      </div>
      <button type="submit" disabled={pending} className={button}>
        {pending ? 'A guardar…' : 'Guardar'}
      </button>
      <div className="basis-full">{msg(state)}</div>
    </form>
  );
}
