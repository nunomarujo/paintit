'use client';

import { useRef } from 'react';
import { ProductThumb } from '@/components/ProductThumb';

/**
 * Fotografia do produto na ficha, com clique para ampliar num popup (sempre ao mesmo tamanho,
 * para comparar produtos facilmente). Sem fotografia, mostra o ícone genérico e não abre popup.
 */
export function ProductPhotoZoom({ fotoPath, alt, className }: { fotoPath: string | null; alt: string; className?: string }) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  if (!fotoPath) return <ProductThumb fotoPath={fotoPath} alt={alt} className={className} />;

  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        className="shrink-0 cursor-zoom-in rounded-lg transition hover:opacity-80"
        aria-label={`Ampliar fotografia: ${alt}`}
      >
        <ProductThumb fotoPath={fotoPath} alt={alt} className={className} />
      </button>
      <dialog
        ref={dialogRef}
        onClick={(e) => {
          if (e.target === dialogRef.current) dialogRef.current?.close();
        }}
        className="rounded-2xl p-0 backdrop:bg-slate-900/60"
      >
        <div className="flex h-[22rem] w-[22rem] flex-col items-center justify-center gap-3 p-4">
          {/* eslint-disable-next-line @next/next/no-img-element -- fotos vêm de domínios externos variados (fabricantes, Leroy Merlin); sem next/image para não exigir allowlist de domínios. */}
          <img src={fotoPath} alt={alt} className="h-full max-h-[18rem] w-full max-w-[18rem] object-contain" />
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            className="rounded-lg border border-slate-300 px-4 py-1.5 text-[17px] hover:bg-slate-50"
          >
            Fechar
          </button>
        </div>
      </dialog>
    </>
  );
}
