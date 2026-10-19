'use client';

import { useState } from 'react';

/** Campo de palavra-passe com botão para mostrar ou esconder o que se escreveu. */
export function PasswordInput({ name, autoComplete, className }: { name: string; autoComplete: string; className: string }) {
  const [show, setShow] = useState(false);
  return (
    <span className="relative block">
      <input name={name} type={show ? 'text' : 'password'} required minLength={8} autoComplete={autoComplete} className={`${className} pr-11`} />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        aria-label={show ? 'Esconder palavra-passe' : 'Mostrar palavra-passe'}
        className="absolute inset-y-0 right-0 mt-1 flex w-10 items-center justify-center text-slate-500 hover:text-slate-800"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
          <circle cx="12" cy="12" r="3" />
          {show && <path d="M3 3l18 18" />}
        </svg>
      </button>
    </span>
  );
}
