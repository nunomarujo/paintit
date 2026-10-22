import type { ReactNode } from 'react';
import { BackofficeSection } from '@/components/BackofficeSection';
import { queueCounts } from '@/lib/backofficeCounts';
import { getUser } from '@/lib/supabase/server';

export default async function RequestsLayout({ children }: { children: ReactNode }) {
  const { supabase } = await getUser();
  const c = await queueCounts(supabase);
  return (
    <BackofficeSection
      title="Pedidos"
      intro="Pedidos de orçamento publicados: os que precisam de mais propostas, as denúncias de anúncios e as fotografias de pormenor por rever antes de chegarem aos pintores."
      tabs={[
        { href: '/app/backoffice/pedidos', label: 'Com poucas propostas' },
        { href: '/app/backoffice/pedidos/denuncias', label: 'Denúncias', count: c.denuncias },
        { href: '/app/backoffice/pedidos/fotografias', label: 'Fotografias por rever', count: c.fotografias },
      ]}
    >
      {children}
    </BackofficeSection>
  );
}
