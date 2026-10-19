'use client';

import { useState } from 'react';
import type { FormState } from '@/app/app/actions';
import { Field, selectClass } from '@/components/Field';
import { ORG_KINDS, ORG_KIND_LABELS, type OrgKind } from '@/domain/organization';
import { useFormAction } from '@/components/useFormAction';

export interface OrgInitial {
  kind: OrgKind;
  nome: string;
  nif: string | null;
  morada_fiscal: string | null;
  codigo_postal: string | null;
  localidade: string | null;
  email_contacto: string | null;
  telefone: string | null;
  atendimento_publico: string | null;
  gerida_por: string | null;
}

interface Props {
  action: (state: FormState, form: FormData) => Promise<FormState>;
  administradoras: { id: string; nome: string }[];
  /** Ao editar: os valores atuais. O tipo de entidade fica fixo. */
  initial?: OrgInitial;
  initialKind?: OrgKind;
  initialGeridaPor?: string;
}

export function OrgForm({ action: submit, administradoras, initial, initialKind, initialGeridaPor }: Props) {
  const { state, pending, formProps } = useFormAction<FormState>(submit, { errors: {} });
  const [kind, setKind] = useState<OrgKind | ''>(initial?.kind ?? initialKind ?? '');
  const e = state.errors;
  const hasShop = kind === 'pintor' || kind === 'fornecedor';
  const v = (field: keyof OrgInitial) => initial?.[field] ?? undefined;

  return (
    <form {...formProps} className="space-y-5">
      {initial ? (
        <>
          <input type="hidden" name="kind" value={initial.kind} />
          <p className="text-sm text-slate-600">
            Tipo de entidade: <strong>{ORG_KIND_LABELS[initial.kind]}</strong>
          </p>
        </>
      ) : (
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
      )}

      <Field
        name="nome"
        label={kind === 'particular' ? 'Nome' : kind === 'condominio' ? 'Designação do condomínio' : 'Denominação social'}
        required
        defaultValue={v('nome')}
        error={e.nome}
        hint={kind === 'condominio' ? 'Por exemplo: Condomínio do prédio da Rua das Flores, 12.' : undefined}
      />

      <Field
        name="nif"
        label={kind === 'condominio' ? 'NIF do condomínio' : 'NIF'}
        inputMode="numeric"
        required={kind !== 'particular' && kind !== ''}
        defaultValue={v('nif')}
        error={e.nif}
        hint={kind === 'particular' ? 'Opcional agora; é pedido quando contratar.' : undefined}
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <Field name="moradaFiscal" label="Morada fiscal" defaultValue={v('morada_fiscal')} error={e.moradaFiscal} />
        <div className="grid grid-cols-2 gap-3">
          <Field
            name="codigoPostal"
            label="Código postal"
            placeholder="0000-000"
            defaultValue={v('codigo_postal')}
            error={e.codigoPostal}
          />
          <Field name="localidade" label="Localidade" defaultValue={v('localidade')} error={e.localidade} />
        </div>
        <Field
          name="emailContacto"
          label="Email de contacto"
          type="email"
          defaultValue={v('email_contacto')}
          error={e.emailContacto}
        />
        <Field name="telefone" label="Telefone" type="tel" defaultValue={v('telefone')} error={e.telefone} />
      </div>

      {hasShop && (
        <Field
          name="atendimentoPublico"
          label="Loja, escritório ou atendimento ao público"
          hint="Morada e horário. Só é mostrado ao cliente depois da apresentação."
          defaultValue={v('atendimento_publico')}
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
          <select name="geridaPor" defaultValue={initial?.gerida_por ?? initialGeridaPor ?? ''} className={selectClass}>
            <option value="">Nenhuma (gestão própria)</option>
            {administradoras.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nome}
              </option>
            ))}
          </select>
        </Field>
      )}
      {/* Ao editar sem administradoras disponíveis, mantém-se a ligação atual. */}
      {kind === 'condominio' && administradoras.length === 0 && initial?.gerida_por && (
        <input type="hidden" name="geridaPor" value={initial.gerida_por} />
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
        {pending ? 'A guardar…' : initial ? 'Guardar alterações' : 'Guardar entidade'}
      </button>
    </form>
  );
}
