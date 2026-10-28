'use client';

import { inviteMember, type FormState } from '@/app/app/actions';
import { Field, selectClass } from '@/components/Field';
import { MEMBER_ROLES, MEMBER_ROLE_LABELS, roleDescription, type OrgKind } from '@/domain/organization';
import { useFormAction } from '@/components/useFormAction';

export function InviteForm({ orgId, orgKind }: { orgId: string; orgKind: OrgKind }) {
  const { state, pending, formProps } = useFormAction<FormState>(inviteMember.bind(null, orgId), { errors: {} }, { resetOnSuccess: true });
  const e = state.errors;

  return (
    <form {...formProps} className="space-y-4">
      <h3 className="text-[17px] font-semibold">Convidar alguém</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="email" label="Email" type="email" required error={e.email} />
        <Field name="role" label="Papel" required error={e.role}>
          <select name="role" required defaultValue="gestor" className={selectClass}>
            {MEMBER_ROLES.map((r) => (
              <option key={r} value={r}>
                {MEMBER_ROLE_LABELS[r].label} — {roleDescription(orgKind, r)}
              </option>
            ))}
          </select>
        </Field>
      </div>
      {state.message && (
        <p className={`text-[17px] ${state.ok ? 'text-tinta-700' : 'text-red-700'}`} role="status">
          {state.message}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="btn-secondary"
      >
        {pending ? 'A criar…' : 'Criar convite'}
      </button>
    </form>
  );
}
