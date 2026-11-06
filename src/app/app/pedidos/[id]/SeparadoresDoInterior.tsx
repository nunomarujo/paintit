'use client';

import { useState, type ReactNode } from 'react';

/**
 * Os separadores do passo «Medidas e fotografias» quando a obra tem interior e exterior (06/11/2026):
 * «Alçados» (a lista de zonas de sempre) e «Interior da habitação». Esconde-se, não se desmonta: mudar de
 * separador não perde o que está escrito. Quem decide se há separadores é `separadoresDoPasso`.
 */
export function SeparadoresDoInterior({ primeiro, zonas, interior }: { primeiro: string; zonas: ReactNode; interior: ReactNode }) {
  const [activo, setActivo] = useState<'zonas' | 'interior'>('zonas');
  return (
    <div>
      <div role="tablist" aria-label="Medidas" className="mb-4 flex flex-wrap gap-2">
        {(
          [
            ['zonas', primeiro],
            ['interior', 'Interior da habitação'],
          ] as const
        ).map(([id, nome]) => (
          <button key={id} type="button" role="tab" aria-selected={activo === id} className={activo === id ? 'btn-primary btn-sm' : 'btn-quiet btn-sm'} onClick={() => setActivo(id)}>
            {nome}
          </button>
        ))}
      </div>
      <div role="tabpanel" hidden={activo !== 'zonas'}>
        {zonas}
      </div>
      <div role="tabpanel" hidden={activo !== 'interior'}>
        {interior}
      </div>
    </div>
  );
}
