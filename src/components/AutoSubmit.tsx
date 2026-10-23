'use client';

import type { ReactNode } from 'react';

/**
 * Envolve um campo (ex.: um <select>) para submeter o formulário assim que o valor muda,
 * sem precisar de um botão "Aplicar" — usado quando a escolha já é suficiente (ex.: tipo de
 * produto), ao contrário de texto livre ou números, onde faz sentido confirmar com um botão.
 */
export function AutoSubmit({ children }: { children: ReactNode }) {
  return (
    <span
      onChange={(e) => {
        (e.target as HTMLElement).closest('form')?.requestSubmit();
      }}
    >
      {children}
    </span>
  );
}
