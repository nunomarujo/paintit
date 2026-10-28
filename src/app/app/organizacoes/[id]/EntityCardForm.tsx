'use client';

import { updateEntityCard, type FormState } from '@/app/app/actions';
import { Field } from '@/components/Field';
import { useFormAction } from '@/components/useFormAction';

/**
 * Cartão de topo de "Dados da entidade" (26/10/2026, docs/DECISOES.md): nome da empresa, nome do
 * gerente, telefone e mail de contacto. O NIF e a morada fiscal continuam na página de edição completa
 * (`/editar`) — este cartão não lhes toca, é só o que aparece mais vezes a quem gere a equipa.
 */
export function EntityCardForm({
  orgId,
  nome,
  gerenteNome,
  telefone,
  emailContacto,
}: {
  orgId: string;
  nome: string;
  gerenteNome: string;
  telefone: string | null;
  emailContacto: string;
}) {
  const { state, pending, formProps } = useFormAction<FormState>(updateEntityCard.bind(null, orgId), { errors: {} });
  const e = state.errors;

  return (
    <form {...formProps} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="nome" label="Nome da empresa" required defaultValue={nome} error={e.nome} />
        <Field name="gerenteNome" label="Nome do gerente" required defaultValue={gerenteNome} error={e.gerenteNome} />
        <Field name="telefone" label="Telefone" type="tel" defaultValue={telefone ?? undefined} error={e.telefone} />
        <Field
          name="emailContacto"
          label="Mail de contacto"
          type="email"
          required
          defaultValue={emailContacto}
          error={e.emailContacto}
          hint="É preciso ter pelo menos um mail registado."
        />
      </div>
      {state.message && (
        <p className={`text-[17px] ${state.ok ? 'text-tinta-700' : 'text-red-700'}`} role="status">
          {state.message}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="btn-primary"
      >
        {pending ? 'A guardar…' : 'Guardar'}
      </button>
    </form>
  );
}
