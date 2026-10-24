import type { ReactNode } from 'react';

const inputClass = 'mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-base';

interface Props {
  name: string;
  label: string;
  error?: string;
  hint?: string;
  /** Explicação do campo, aberta por um (i) ao lado da etiqueta: para que serve e o que se espera ali.
   * Fica escondida por omissão — o formulário continua limpo, e o texto aparece só a quem o pede
   * (pedido do promotor, 24/10/2026). Para uma frase curta e sempre visível, usar `hint`. */
  info?: ReactNode;
  required?: boolean;
  type?: string;
  inputMode?: 'text' | 'numeric' | 'email' | 'tel';
  placeholder?: string;
  defaultValue?: string;
  children?: ReactNode;
}

/** Campo de formulário com etiqueta, ajuda e erro. `children` substitui o input (ex.: um select). */
export function Field({ name, label, error, hint, info, required, children, ...input }: Props) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      <span className="inline-flex items-baseline gap-1">
        {label}
        {required && <span className="text-red-700">*</span>}
        {info && <FieldInfo label={label}>{info}</FieldInfo>}
      </span>
      {children ?? (
        <input
          name={name}
          required={required}
          aria-invalid={error ? true : undefined}
          className={inputClass}
          {...input}
        />
      )}
      {hint && !error && <span className="mt-1 block text-xs font-normal text-slate-500">{hint}</span>}
      {error && (
        <span className="mt-1 block text-xs font-normal text-red-700" role="alert">
          {error}
        </span>
      )}
    </label>
  );
}

/** O (i) em si: `<details>` nativo, para funcionar sem JavaScript e sem estado nenhum. */
function FieldInfo({ label, children }: { label: string; children: ReactNode }) {
  return (
    <details className="group inline-block align-baseline font-normal">
      <summary
        aria-label={`O que indicar em "${label}"`}
        className="inline-flex h-4 w-4 cursor-pointer list-none items-center justify-center rounded-full border border-slate-400 text-[10px] font-semibold text-slate-600 hover:border-tinta-600 hover:text-tinta-700 group-open:border-tinta-600 group-open:text-tinta-700"
      >
        i
      </summary>
      <span className="mt-1 block rounded-lg bg-slate-50 p-2 text-xs font-normal text-slate-700">{children}</span>
    </details>
  );
}

export const selectClass = inputClass + ' bg-white';
