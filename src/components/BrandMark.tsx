import { BRAND } from '@/config/brand';

/** Marca: prédio de traço simples, como no protótipo, com o nome da marca. */
export function BrandMark({ size = 'md' }: { size?: 'md' | 'lg' }) {
  return (
    <span className={`flex items-center gap-2 whitespace-nowrap font-bold tracking-tight text-tinta-600 ${size === 'lg' ? 'text-3xl' : 'text-2xl'}`}>
      <svg viewBox="0 0 32 38" aria-hidden="true" className={size === 'lg' ? 'h-9 w-8' : 'h-7 w-6'} fill="none" stroke="currentColor" strokeWidth="1.7">
        <path d="M3 34V13l9-5v26M12 34V3l10 4v27M22 34V16l7 4v14M1 35h30M6 16v3m0 5v3m10-17v3m0 5v3m0 5v3m10-5v4" />
      </svg>
      {BRAND.name}
    </span>
  );
}
