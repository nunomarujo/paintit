'use client';

import { useState } from 'react';
import type { FormState } from '@/app/app/actions';
import { useFormAction } from '@/components/useFormAction';
import { CAMPO_LABELS, type Campo, type Lado } from '@/domain/elementosDoContrato';
import { confirmarCodigoDoEmail, pedirCodigoDoEmail, registarElemento } from '../elementos';

const INICIAL: FormState = { errors: {} };

/**
 * Um campo do lado de quem está a ver, enquanto se pode alterar: o valor em vigor e o formulário para o
 * corrigir. O email diferente do da sessão pede um código de 6 algarismos; até ser confirmado, vale o
 * anterior. Os nomes dos campos são os que `elementos.ts` lê; o servidor volta a validar tudo.
 */
export function AlterarElemento({
  engagementId,
  lado,
  campo,
  atual,
  emailDaSessao,
}: {
  engagementId: string;
  lado: Lado;
  campo: Campo;
  atual: string | null;
  emailDaSessao?: string | null;
}) {
  const [aberto, setAberto] = useState(false);
  const [emailPendente, setEmailPendente] = useState<string | null>(null);
  const direto = useFormAction<FormState>(registarElemento.bind(null, engagementId, lado, campo), INICIAL, { resetOnSuccess: true });
  const pedir = useFormAction<FormState & { pendente?: string }>(
    async (s, f) => {
      const r = await pedirCodigoDoEmail(engagementId, lado, s, f);
      if (r.pendente) setEmailPendente(r.pendente);
      return r;
    },
    INICIAL,
  );
  const confirmar = useFormAction<FormState>(confirmarCodigoDoEmail.bind(null, engagementId, lado), INICIAL, { resetOnSuccess: true });
  const usado = campo === 'email' ? pedir : direto;

  if (!aberto) {
    return (
      <button type="button" className="btn-quiet btn-sm" onClick={() => setAberto(true)}>
        {atual ? 'Corrigir' : 'Indicar'}
      </button>
    );
  }
  return (
    <div className="mt-2 space-y-3">
      <form {...usado.formProps} className="flex flex-wrap items-end gap-2">
        <label className="block min-w-[16rem] flex-1 text-[15px] font-medium text-slate-700">
          {atual ? `Novo ${CAMPO_LABELS[campo].toLowerCase()}` : CAMPO_LABELS[campo]}
          <input
            name="valor"
            className="campo mt-1"
            inputMode={campo === 'telefone' ? 'tel' : campo === 'email' ? 'email' : 'text'}
            autoComplete={campo === 'email' ? 'email' : campo === 'telefone' ? 'tel' : 'off'}
            defaultValue={campo === 'email' && !atual ? (emailDaSessao ?? '') : ''}
            placeholder={campo === 'iban' ? 'PT50 0000 0000 0000 0000 0000 0' : undefined}
            aria-invalid={usado.state.errors.valor ? true : undefined}
          />
        </label>
        <button type="submit" className="btn-primary btn-sm" disabled={usado.pending}>
          {campo === 'email' ? 'Confirmar o email' : 'Registar'}
        </button>
        <button type="button" className="btn-quiet btn-sm" onClick={() => setAberto(false)}>
          Fechar
        </button>
      </form>
      {usado.state.errors.valor && (
        <p className="text-[15px] text-red-700" role="alert">
          {usado.state.errors.valor}
        </p>
      )}
      {usado.state.message && <p className={`text-[15px] ${usado.state.ok ? 'text-slate-700' : 'text-amber-800'}`}>{usado.state.message}</p>}
      {campo === 'email' && (
        <p className="max-w-[54ch] text-[15px] text-slate-600">
          Um email diferente do da sessão recebe um código de 6 algarismos; até o indicar aqui, vale o anterior. O email da sessão não precisa
          de código.
        </p>
      )}
      {campo === 'email' && emailPendente && (
        <form {...confirmar.formProps} className="flex flex-wrap items-end gap-2">
          <label className="block text-[15px] font-medium text-slate-700">
            Código enviado para {emailPendente}
            <input name="codigo" inputMode="numeric" autoComplete="one-time-code" maxLength={7} className="campo mt-1 w-40" />
          </label>
          <button type="submit" className="btn-primary btn-sm" disabled={confirmar.pending}>
            Confirmar o código
          </button>
          {(confirmar.state.errors.codigo || confirmar.state.message) && (
            <p className={`w-full text-[15px] ${confirmar.state.ok ? 'text-slate-700' : 'text-amber-800'}`} role="status">
              {confirmar.state.errors.codigo ?? confirmar.state.message}
            </p>
          )}
        </form>
      )}
    </div>
  );
}
