import type { ReactNode } from 'react';
import { BackofficeSection } from '@/components/BackofficeSection';
import { queueCounts } from '@/lib/backofficeCounts';
import { getUser } from '@/lib/supabase/server';

export default async function EngagementsLayout({ children }: { children: ReactNode }) {
  const { supabase } = await getUser();
  const c = await queueCounts(supabase);
  return (
    <BackofficeSection
      title="Contratações"
      intro="Da escolha da proposta às duas assinaturas: o que espera uma confirmação da equipa, todas as contratações e as assinaturas a conferir."
      tabs={[
        { href: '/app/backoffice/contratacoes', label: 'À espera da plataforma' },
        { href: '/app/backoffice/contratacoes/todas', label: 'Todas' },
        { href: '/app/backoffice/contratacoes/assinaturas', label: 'Assinaturas a conferir', count: c.assinaturas },
        { href: '/app/backoffice/contratacoes/litigios', label: 'Em litígio' },
      ]}
    >
      {children}
    </BackofficeSection>
  );
}
