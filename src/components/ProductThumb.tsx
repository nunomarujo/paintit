import { TinIcon } from '@/components/TinIcon';

/** Fotografia do produto de referência (foto_path); lata genérica como alternativa quando não há foto. */
export function ProductThumb({ fotoPath, alt, className }: { fotoPath: string | null; alt: string; className?: string }) {
  if (!fotoPath) return <TinIcon />;
  // eslint-disable-next-line @next/next/no-img-element -- fotos vêm de domínios externos variados (fabricantes, Leroy Merlin); sem next/image para não exigir allowlist de domínios.
  return <img src={fotoPath} alt={alt} loading="lazy" className={className ?? 'h-12 w-10 shrink-0 rounded-lg object-contain'} />;
}
