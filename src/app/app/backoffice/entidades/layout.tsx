import type { ReactNode } from 'react';
import { BackofficeSection } from '@/components/BackofficeSection';
import { queueCounts } from '@/lib/backofficeCounts';
import { getUser } from '@/lib/supabase/server';

export default async function EntitiesLayout({ children }: { children: ReactNode }) {
  const { supabase } = await getUser();
  const c = await queueCounts(supabase);
  return (
    <BackofficeSection
      title="Entidades"
      intro="Empresas e organizações registadas: documentos à espera de validação e, nos fornecedores, as subscrições e os códigos promocionais."
      tabs={[
        { href: '/app/backoffice/entidades', label: 'Documentos por validar', count: c.documentos },
        { href: '/app/backoffice/entidades/subscricoes', label: 'Subscrições de fornecedores' },
        { href: '/app/backoffice/entidades/promocoes', label: 'Códigos promocionais' },
        { href: '/app/backoffice/entidades/regimes', label: 'Regimes de fornecedores', count: c.regimes },
      ]}
    >
      {children}
    </BackofficeSection>
  );
}
