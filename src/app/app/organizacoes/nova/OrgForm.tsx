'use client';

import { useActionState, useState } from 'react';
import { createOrganization, type FormState } from '@/app/app/actions';
import { Field, selectClass } from '@/components/Field';
import { ORG_KINDS, ORG_KIND_LABELS, type OrgKind } from '@/domain/organization';

interface Props {
  administradoras: { id: string; nome: string }[];
  initialKind?: OrgKind;
  initialGeridaPor?: string;
}

export function OrgForm({ administradoras, initialKind, initialGeridaPor }: Props) {
  const [state, action, pending] = useActionState<FormState, FormData>(createOrganization, { errors: {} });
  const [kind, setKind] = useState<OrgKind | ''>(initialKind ?? '');
  const e = state.errors;
  const hasShop = kind === 'pintor' || kind === 'fornecedor';

  return (
    <form action={action} className="space-y-5">
      <Field name="kind" label="Tipo de entidade" required error={e.kind}>
        <select
          name="kind"
          required
          value={kind}
          onChange={(ev) => setKind(ev.target.value as OrgKind)}
          className={selectClass}
        >
          <option value="" disabled>
            Escolha…
          </option>
          {ORG_KINDS.map((k) => (
            <option key={k} value={k}>
              {ORG_KIND_LABELS[k]}
            </option>
          ))}
        </select>
      </Field>

      <Field
        name="nome"
        label={kind === 'particular' ? 'Nome' : kind === 'condominio' ? 'Designação do condomínio' : 'Denominação social'}
        required
        error={e.nome}
        hint={kind === 'condominio' ? 'Por exemplo: Condomínio do prédio da Rua das Flores, 12.' : undefined}
      />

      <Field
        name="nif"
        label={kind === 'condominio' ? 'NIF do condomínio' : 'NIF'}
        inputMode="numeric"
        required={kind !== 'particular' && kind !== ''}
        error={e.nif}
        hint={kind === 'particular' ? 'Opcional agora; é pedido quando contratar.' : undefined}
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <Field name="moradaFiscal" label="Morada fiscal" error={e.moradaFiscal} />
        <div className="grid grid-cols-2 gap-3">
          <Field name="codigoPostal" label="Código postal" placeholder="0000-000" error={e.codigoPostal} />
          <Field name="localidade" label="Localidade" error={e.localidade} />
        </div>
        <Field name="emailContacto" label="Email de contacto" type="email" error={e.emailContacto} />
        <Field name="telefone" label="Telefone" type="tel" error={e.telefone} />
      </div>

      {hasShop && (
        <Field
          name="atendimentoPublico"
          label="Loja, escritório ou atendimento ao público"
          hint="Morada e horário. Só é mostrado ao cliente depois da apresentação."
          error={e.atendimentoPublico}
        />
      )}

      {kind === 'condominio' && administradoras.length > 0 && (
        <Field
          name="geridaPor"
          label="Gerido pela administradora"
          error={e.geridaPor}
          hint="A equipa da administradora passa a gerir este condomínio e os seus prédios."
        >
          <select name="geridaPor" defaultValue={initialGeridaPor ?? ''} className={selectClass}>
            <option value="">Nenhuma (gestão própria)</option>
            {administradoras.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nome}
              </option>
            ))}
          </select>
        </Field>
      )}

      {state.message && (
        <p className="text-sm text-red-700" role="alert">
          {state.message}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-tinta-600 px-5 py-2 font-semibold text-white hover:bg-tinta-700 disabled:opacity-60"
      >
        {pending ? 'A guardar…' : 'Guardar entidade'}
      </button>
    </form>
  );
}
