import { notFound } from 'next/navigation';
import { MetodologiaPublica } from '@/components/MetodologiaPublica';
import { BRAND } from '@/config/brand';
import { METODOLOGIA, VERSAO_METODOLOGIA } from '@/domain/metodologia';

export const metadata = { title: `Como comparamos as propostas · ${BRAND.name}` };

/**
 * Uma versão concreta da metodologia — o endereço que os relatórios imprimem.
 *
 * Enquanto houver uma só versão, este caminho serve a mesma página. Quando as regras mudarem, a
 * versão anterior passa a ter o seu próprio texto aqui, guardado, e os PDF emitidos com ela
 * continuam a explicar-se: é para isso que o endereço leva a versão e não a palavra «actual».
 */
const VERSOES = new Set([VERSAO_METODOLOGIA]);

export default async function MetodologiaVersaoPage({ params }: { params: Promise<{ versao: string }> }) {
  const { versao } = await params;
  if (!VERSOES.has(versao)) notFound();
  return <MetodologiaPublica m={{ ...METODOLOGIA, versao }} />;
}

export function generateStaticParams() {
  return [...VERSOES].map((versao) => ({ versao }));
}
