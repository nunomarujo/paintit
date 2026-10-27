import { BRAND } from '@/config/brand';

/**
 * Marca: prédio de traço simples, como no protótipo, com o nome da marca.
 *
 * `sm` (20px) entrou a 27/10/2026 para o cabeçalho da página inicial: a 26px a marca tinha o mesmo
 * peso visual do que o botão ao lado, e as duas disputavam a atenção logo à entrada.
 * `tone` escolhe a cor: 'tinta' (paleta antiga, omissão — as outras 6 páginas que usam isto não mudam)
 * ou 'marca' (paleta nova do desenho do site, 25/10/2026 — usada por agora só na barra lateral).
 */
export function BrandMark({ size = 'md', tone = 'tinta' }: { size?: 'sm' | 'md' | 'lg'; tone?: 'tinta' | 'marca' }) {
  return (
    <span
      className={`flex items-center gap-2 whitespace-nowrap font-bold tracking-tight ${tone === 'marca' ? 'text-marca-ink' : 'text-tinta-600'} ${size === 'lg' ? 'text-[34px]' : size === 'sm' ? 'text-[20px] leading-tight' : 'text-[26px] leading-tight'}`}
    >
      <svg viewBox="0 0 32 38" aria-hidden="true" className={size === 'lg' ? 'h-9 w-8' : size === 'sm' ? 'h-6 w-5' : 'h-7 w-6'} fill="none" stroke="currentColor" strokeWidth="1.7">
        <path d="M3 34V13l9-5v26M12 34V3l10 4v27M22 34V16l7 4v14M1 35h30M6 16v3m0 5v3m10-17v3m0 5v3m0 5v3m10-5v4" />
      </svg>
      {BRAND.name}
    </span>
  );
}
