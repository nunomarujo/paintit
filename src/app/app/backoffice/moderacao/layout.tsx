import type { ReactNode } from 'react';
import { BackofficeSection } from '@/components/BackofficeSection';
import { queueCounts } from '@/lib/backofficeCounts';
import { getUser } from '@/lib/supabase/server';

export default async function ModerationLayout({ children }: { children: ReactNode }) {
  const { supabase } = await getUser();
  const c = await queueCounts(supabase);
  return (
    <BackofficeSection
      title="Moderação"
      intro="Tentativas de partilhar contactos antes da apresentação: 1.ª tentativa, aviso; 2.ª, último aviso (com um pedido de revisão possível); 3.ª, conta bloqueada."
      tabs={[
        { href: '/app/backoffice/moderacao', label: 'Pedidos de revisão', count: c.revisoes },
        { href: '/app/backoffice/moderacao/avisos', label: 'Avisos e bloqueios' },
      ]}
    >
      {children}
    </BackofficeSection>
  );
}
