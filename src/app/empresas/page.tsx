import type { Metadata } from 'next';
import { CONTEUDO_DE_PERFIL, DEMO_DE_PERFIL, toOrg } from '@/components/landing/perfis';
import { PaginaDePerfil } from '@/components/landing/PaginaDePerfil';
import { BRAND } from '@/config/brand';

export const metadata: Metadata = {
  title: `Empresas de pintura — ${BRAND.name}`,
  description: 'Oportunidades reais na sua zona, orçamento guiado em 4 passos com 13 trabalhos padronizados e produtos do catálogo, documento A4 pronto, contrato assinado na plataforma. Só paga quando ganha.',
};

/** Página própria do pintor, fora da página inicial desde 01/11/2026 (ver `PaginaDePerfil`). */
export default function Page() {
  const c = CONTEUDO_DE_PERFIL.pintor;
  return (
    <PaginaDePerfil
      eyebrow="Empresas de pintura"
      titulo="Há mais obras do que empresas para as fazer."
      intro="Oportunidades reais na sua zona, orçamento guiado em 4 passos com 13 trabalhos padronizados e produtos do catálogo, documento A4 pronto, contrato assinado na plataforma. Só paga quando ganha."
      demo={DEMO_DE_PERFIL.pintor}
      destaques={c.destaques}
      beneficios={c.beneficios}
      nota={c.nota}
      ctaHref={toOrg('pintor')}
      ctaTexto={c.ctaTexto}
      ctaNota={c.ctaNota}
    />
  );
}
