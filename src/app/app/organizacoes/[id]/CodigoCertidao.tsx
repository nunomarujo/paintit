'use client';

import type { FormState } from '@/app/app/actions';
import { Field } from '@/components/Field';
import { useFormAction } from '@/components/useFormAction';
import type { EstadoDaLeitura } from '@/domain/poderes';
import { definirCodigoCertidao } from './certidao-actions';

/**
 * O código de acesso da certidão permanente (05/11/2026). Depois de guardado nunca volta a aparecer: no lugar
 * dele fica o estado da leitura («guardado · por ler pela equipa», «lida a … · válida até …»). Quem gere a
 * entidade vê também os nomes que a equipa registou, para dar por um erro de transcrição antes de um contrato.
 */
export function CodigoCertidao({
  orgId,
  estado,
  texto,
  membros,
  podeIndicar,
  obrigatoria,
}: {
  orgId: string;
  estado: EstadoDaLeitura;
  texto: string;
  membros: { nome: string; cargo: string }[];
  podeIndicar: boolean;
  /** A certidão é pedida a esta entidade: sem código nem ficheiro, o estado fica a âmbar. */
  obrigatoria: boolean;
}) {
  const { state, pending, formProps } = useFormAction<FormState>(
    definirCodigoCertidao.bind(null, orgId),
    { errors: {} },
    { resetOnSuccess: true },
  );
  const emFalta = (estado === 'sem_codigo' && obrigatoria) || estado === 'caducada';

  return (
    <div className="space-y-3">
      <h3 className="text-[17px] font-semibold">Código de acesso à certidão permanente</h3>
      <p className="max-w-[54ch] text-[15px] text-slate-600">
        Com o código, a equipa da plataforma abre a certidão no portal do registo comercial e regista quem pode assinar contratos em nome da
        empresa. Entregar o código vale por entregar a certidão.
      </p>
      <p className={`text-[17px] ${emFalta ? 'text-amber-800' : 'text-slate-700'}`}>{texto}</p>
      {membros.length > 0 && (
        <p className="max-w-[54ch] text-[15px] text-slate-600">
          Registado pela equipa: {membros.map((m) => `${m.nome} (${m.cargo.toLowerCase()})`).join(', ')}. Se algum nome estiver errado,
          indique-o à equipa da plataforma.
        </p>
      )}
      {podeIndicar && (
        <form {...formProps} className="space-y-3">
          <Field
            name="codigo"
            label={estado === 'sem_codigo' ? 'Código de acesso' : 'Trocar o código'}
            error={state.errors.codigo}
            hint={
              estado === 'sem_codigo'
                ? '12 algarismos (NNNN-NNNN-NNNN). Depois de guardado, o código não volta a ser mostrado.'
                : 'Um código novo põe a leitura por fazer de novo. O código guardado não é mostrado.'
            }
          >
            <input
              name="codigo"
              required
              autoComplete="off"
              spellCheck={false}
              inputMode="numeric"
              placeholder="0000-0000-0000"
              aria-invalid={state.errors.codigo ? true : undefined}
              className="mt-1 campo max-w-[20ch]"
            />
          </Field>
          {state.message && (
            <p className={`text-[17px] ${state.ok ? 'text-tinta-700' : 'text-red-700'}`} role="status">
              {state.message}
            </p>
          )}
          <button type="submit" disabled={pending} className="btn-secondary">
            {pending ? 'A guardar…' : 'Guardar o código'}
          </button>
        </form>
      )}
    </div>
  );
}
