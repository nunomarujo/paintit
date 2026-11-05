'use client';

import { useState } from 'react';
import type { FormState } from '@/app/app/actions';
import { Field, selectClass } from '@/components/Field';
import { useFormAction } from '@/components/useFormAction';
import { MAX_MEMBROS, type MembroInput } from '@/domain/poderes';
import { registarLeitura } from './actions';

export interface LeituraInicial {
  membros: MembroInput[];
  formaDeObrigar: string;
  assinaturasExigidas: 1 | 2 | null;
  validaAte: string;
}

/**
 * O que a equipa regista ao ler a certidão (ou a ata): quem tem poderes, a forma de obrigar tal como está
 * escrita, quantas assinaturas obrigam e a validade. Só isto — moradas, estado civil e o resto da certidão
 * ficam lá (RGPD: minimização).
 */
export function LeituraForm({ orgId, fonte, inicial }: { orgId: string; fonte: 'certidao' | 'ata'; inicial?: LeituraInicial }) {
  const { state, pending, formProps } = useFormAction<FormState>(registarLeitura.bind(null, orgId, fonte), { errors: {} });
  const [linhas, setLinhas] = useState(Math.max(inicial?.membros.length ?? 0, fonte === 'ata' ? 1 : 2));
  const e = state.errors;
  const ata = fonte === 'ata';

  return (
    <form {...formProps} className="mt-4 space-y-4">
      <fieldset className="space-y-4">
        <legend className="text-[17px] font-semibold">
          {ata ? 'Quem representa o condomínio, segundo a ata' : 'Quem tem poderes, segundo a certidão'}
        </legend>
        {Array.from({ length: linhas }, (_, i) => {
          const m = inicial?.membros[i];
          return (
            <div key={i} className="grid gap-3 rounded-lg border border-slate-200 p-3 sm:grid-cols-3">
              <Field name="membroNome" label={`Nome (${i + 1})`} defaultValue={m?.nome} hint="Como está escrito, em maiúsculas." />
              <Field name="membroCargo" label="Cargo" defaultValue={m?.cargo} placeholder={ata ? 'Administrador' : 'Gerente'} />
              <Field name="membroNif" label="NIF (opcional)" inputMode="numeric" defaultValue={m?.nif ?? undefined} />
            </div>
          );
        })}
        {e.membros && (
          <p className="text-[15px] text-red-700" role="alert">
            {e.membros}
          </p>
        )}
        {linhas < MAX_MEMBROS && (
          <button type="button" onClick={() => setLinhas((n) => Math.min(n + 1, MAX_MEMBROS))} className="btn-secondary btn-sm">
            Acrescentar pessoa
          </button>
        )}
      </fieldset>

      <Field
        name="formaDeObrigar"
        label="Forma de obrigar"
        required
        error={e.formaDeObrigar}
        hint="Copiada da certidão, palavra por palavra."
      >
        <textarea name="formaDeObrigar" required rows={2} maxLength={1000} defaultValue={inicial?.formaDeObrigar} className="mt-1 campo" />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="assinaturas" label="Assinaturas que obrigam" required error={e.assinaturas}>
          <select
            name="assinaturas"
            required
            defaultValue={inicial ? (inicial.assinaturasExigidas === null ? 'confirmar' : String(inicial.assinaturasExigidas)) : ''}
            className={selectClass}
          >
            <option value="" disabled>
              Escolha…
            </option>
            <option value="1">Uma (basta uma pessoa da lista)</option>
            <option value="2">Duas (em conjunto)</option>
            <option value="confirmar">A confirmar (forma invulgar)</option>
          </select>
        </Field>
        <Field
          name="validaAte"
          label={ata ? 'Mandato até' : 'Válida até'}
          type="date"
          required
          error={e.validaAte}
          defaultValue={inicial?.validaAte}
          hint={ata ? 'Fim do mandato indicado na ata.' : 'A data «válida até» da certidão.'}
        />
      </div>

      {state.message && (
        <p className={`text-[17px] ${state.ok ? 'text-tinta-700' : 'text-red-700'}`} role="status">
          {state.message}
        </p>
      )}
      <button type="submit" disabled={pending} className="btn-primary">
        {pending ? 'A registar…' : 'Registar a leitura'}
      </button>
    </form>
  );
}
