import type { Metadata } from 'next';
import { CONTEUDO_DE_PERFIL, DEMO_DE_PERFIL, toOrg } from '@/components/landing/perfis';
import { PaginaDePerfil } from '@/components/landing/PaginaDePerfil';
import { BRAND } from '@/config/brand';

export const metadata: Metadata = {
  title: `Fornecedores de tintas — ${BRAND.name}`,
  description: 'Fichas técnicas, rendimento e preço de referência aparecem ao pintor dentro do orçamento, no campo certo. Descontos automáticos por perfil de cliente. E um canal novo para a sua equipa comercial: os levantamentos no terreno.',
};

/** Página própria do fornecedor, fora da página inicial desde 01/11/2026 (ver `PaginaDePerfil`). */
export default function Page() {
  const c = CONTEUDO_DE_PERFIL.fornecedor;
  return (
    <PaginaDePerfil
      eyebrow="Fornecedores de tintas"
      titulo="O seu produto, onde a decisão é tomada."
      intro="Fichas técnicas, rendimento e preço de referência aparecem ao pintor dentro do orçamento, no campo certo. Descontos automáticos por perfil de cliente. E um canal novo para a sua equipa comercial: os levantamentos no terreno."
      demo={DEMO_DE_PERFIL.fornecedor}
      destaques={c.destaques}
      beneficios={c.beneficios}
      nota={c.nota}
      ctaHref={toOrg('fornecedor')}
      ctaTexto={c.ctaTexto}
      ctaNota={c.ctaNota}
    />
  );
}
