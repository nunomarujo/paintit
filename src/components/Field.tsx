import type { ReactNode } from 'react';

const inputClass = 'mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-base';

interface Props {
  name: string;
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  type?: string;
  inputMode?: 'text' | 'numeric' | 'email' | 'tel';
  placeholder?: string;
  defaultValue?: string;
  children?: ReactNode;
}

/** Campo de formulário com etiqueta, ajuda e erro. `children` substitui o input (ex.: um select). */
export function Field({ name, label, error, hint, required, children, ...input }: Props) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      {label}
      {required && <span className="text-red-700"> *</span>}
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

export const selectClass = inputClass + ' bg-white';
