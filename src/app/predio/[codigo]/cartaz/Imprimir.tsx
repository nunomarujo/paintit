'use client';

export function Imprimir() {
  return (
    <button type="button" className="btn-secondary mt-10 print:hidden" onClick={() => window.print()}>
      Imprimir
    </button>
  );
}
