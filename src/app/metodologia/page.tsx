import { MetodologiaPublica } from '@/components/MetodologiaPublica';
import { BRAND } from '@/config/brand';

export const metadata = { title: `Como comparamos as propostas · ${BRAND.name}` };

/** A versão em vigor. As anteriores vivem em /metodologia/<versao>, para os relatórios já emitidos. */
export default function MetodologiaPage() {
  return <MetodologiaPublica />;
}

export const dynamic = 'force-static';
