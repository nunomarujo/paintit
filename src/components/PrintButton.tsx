'use client';

/** Guardar em PDF é imprimir e escolher "Guardar como PDF": é o que o navegador já faz bem. */
export function PrintButton({ children = 'Guardar em PDF', className }: { children?: React.ReactNode; className?: string }) {
  return (
    <button type="button" onClick={() => window.print()} className={className ?? 'rounded-lg bg-tinta-700 px-4 py-2 text-sm font-semibold text-white'}>
      {children}
    </button>
  );
}
