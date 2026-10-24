'use client';

import { useState } from 'react';
import type { FormState } from '@/app/app/actions';
import { AddressFields } from '@/components/AddressFields';
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
  alertas_autorizados: boolean;
}

interface Props {
  action: (state: FormState, form: FormData) => Promise<FormState>;
  administradoras: { id: string; nome: string }[];
  /** Ao editar: os valores atuais. O tipo de entidade fica fixo. */
  initial?: OrgInitial;
  initialKind?: OrgKind;
  initialGeridaPor?: string;
  /** Tipos permitidos a esta conta (um perfil por conta). */
  kinds?: OrgKind[];
  /** Email da conta, sugerido como contacto da entidade nova. */
  defaultEmail?: string;
  /** Código de um convite de adesão de um fornecedor (/convite-fornecedor/[code]), pré-preenchido. */
  defaultCodigoConvite?: string;
}

export function OrgForm({
  action: submit,
  administradoras,
  initial,
  initialKind,
  initialGeridaPor,
  kinds,
  defaultEmail,
  defaultCodigoConvite,
}: Props) {
  const { state, pending, formProps } = useFormAction<FormState>(submit, { errors: {} });
  const [kind, setKind] = useState<OrgKind | ''>(initial?.kind ?? initialKind ?? '');
  const e = state.errors;
  const hasShop = kind === 'pintor' || kind === 'fornecedor';
  const v = (field: keyof Omit<OrgInitial, 'alertas_autorizados'>) => initial?.[field] ?? undefined;

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
            {(kinds ?? ORG_KINDS).map((k) => (
              <option key={k} value={k}>
                {ORG_KIND_LABELS[k]}
              </option>
            ))}
          </select>
        </Field>
      )}

      {/* Administradora: os campos são da **empresa gestora**, não de nenhum condomínio que ela administre
          (cada prédio tem ficha própria, com o NIPC do próprio condomínio — ver "Prédios sob administração"
          na página da entidade). Dizê-lo nos rótulos, a pedido do promotor em 24/10/2026: sem isso não se
          percebe de quem é o nome nem de quem é o NIF que se está a preencher. */}
      {kind === 'administradora' && !initial && (
        <p className="rounded-xl border border-tinta-100 bg-tinta-50 p-4 text-sm text-slate-700">
          Estes dados são <strong>da empresa gestora</strong>. Os condomínios que administra registam-se a
          seguir, um a um, em “Prédios sob administração” — cada um com a sua morada e o seu próprio NIPC.
        </p>
      )}

      <Field
        name="nome"
        label={
          kind === 'particular'
            ? 'Nome'
            : kind === 'condominio'
              ? 'Designação do condomínio'
              : kind === 'administradora'
                ? 'Denominação social da empresa gestora'
                : 'Denominação social'
        }
        required
        defaultValue={v('nome')}
        error={e.nome}
        hint={
          kind === 'condominio'
            ? 'Por exemplo: Condomínio do prédio da Rua das Flores, 12.'
            : kind === 'administradora'
              ? 'A empresa de administração em si — não o nome de nenhum dos condomínios que gere.'
              : undefined
        }
      />

      <Field
        name="nif"
        label={kind === 'condominio' ? 'NIF do condomínio' : kind === 'administradora' ? 'NIF da empresa gestora' : 'NIF'}
        inputMode="numeric"
        required={kind !== 'particular' && kind !== ''}
        defaultValue={v('nif')}
        error={e.nif}
        hint={
          kind === 'particular'
            ? 'Opcional agora; é pedido quando contratar.'
            : kind === 'administradora'
              ? 'O NIPC da própria empresa gestora. O NIPC de cada condomínio é pedido na ficha do prédio.'
              : undefined
        }
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <AddressFields
            moradaName="moradaFiscal"
            moradaLabel="Morada fiscal"
            initial={{ morada: v('morada_fiscal'), codigoPostal: v('codigo_postal'), localidade: v('localidade') }}
            errors={e}
          />
        </div>
        <Field
          name="emailContacto"
          label="Email de contacto"
          type="email"
          defaultValue={v('email_contacto') ?? defaultEmail}
          error={e.emailContacto}
          hint="Só é mostrado à outra parte depois da apresentação."
        />
        <Field
          name="telefone"
          label="Telefone"
          type="tel"
          defaultValue={v('telefone')}
          error={e.telefone}
          hint="Só é mostrado à outra parte depois da apresentação."
        />
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

      {kind === 'fornecedor' && (
        <label className="flex items-start gap-2 rounded-xl bg-slate-50 p-4 text-sm">
          <input type="checkbox" name="alertasAutorizados" value="sim" defaultChecked={initial?.alertas_autorizados} className="mt-1" />
          <span>
            Autorizo o envio de mensagens e alertas por telefone e email.{' '}
            <span className="text-slate-600">
              Necessário, junto com o telefone e o email de contacto preenchidos acima, para gozar o bónus de adesão do
              avaliador quando um convite de adesão a um pintor é aceite.
            </span>
          </span>
        </label>
      )}

      {!initial && kind === 'fornecedor' && (
        <Field
          name="codigoReferencia"
          label="Código de quem o indicou (opcional)"
          hint="Se um pintor lhe deu um código, indique-o aqui e fica registado como referência dele."
        >
          <input
            name="codigoReferencia"
            maxLength={14}
            autoComplete="off"
            className="mt-1 block w-48 rounded-lg border border-slate-300 px-3 py-2 font-mono text-base uppercase tracking-wider"
          />
        </Field>
      )}

      {!initial && kind === 'pintor' && (
        <Field
          name="codigoConvite"
          label="Código de convite de um fornecedor (opcional)"
          hint="Se um fornecedor o convidou, indique aqui o código e fica ligado a ele."
        >
          <input
            name="codigoConvite"
            defaultValue={defaultCodigoConvite}
            maxLength={14}
            autoComplete="off"
            className="mt-1 block w-48 rounded-lg border border-slate-300 px-3 py-2 font-mono text-base uppercase tracking-wider"
          />
        </Field>
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

      {/* Sem isto, um erro só de campo (ex.: código postal incompleto) deixava o botão mudo: a página
          não se mexia e parecia que o formulário não gravava nem dava erro (promotor, 24/10/2026). */}
      {!state.message && Object.values(e).some(Boolean) && (
        <p className="text-sm text-red-700" role="alert">
          {Object.values(e).filter(Boolean).length === 1
            ? 'Falta corrigir um campo, assinalado a vermelho acima.'
            : `Faltam corrigir ${Object.values(e).filter(Boolean).length} campos, assinalados a vermelho acima.`}
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
