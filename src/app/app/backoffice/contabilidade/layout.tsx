import type { ReactNode } from 'react';
import { BackofficeSection } from '@/components/BackofficeSection';
import { queueCounts } from '@/lib/backofficeCounts';
import { getUser } from '@/lib/supabase/server';

const B = '/app/backoffice/contabilidade';

export default async function AccountingLayout({ children }: { children: ReactNode }) {
  const { supabase } = await getUser();
  const c = await queueCounts(supabase);
  return (
    <BackofficeSection
      title="Contabilidade"
      intro="Livro de movimentos em partidas dobradas, em euros e cêntimos. Nada se altera nem se apaga: corrige-se com estorno. Os lançamentos fazem-se sozinhos todos os dias; «Sincronizar agora» faz-os já."
      tabs={[
        { href: B, label: 'Painel' },
        { href: `${B}/movimentos`, label: 'Movimentos' },
        { href: `${B}/reconciliacao`, label: 'Reconciliação Stripe' },
        { href: `${B}/banco`, label: 'Banco', count: c.banco },
        { href: `${B}/pagar`, label: 'A pagar', count: c.resgates + c.regimes },
        { href: `${B}/periodos`, label: 'Períodos' },
        { href: `${B}/contratacoes`, label: 'Por contratação' },
      ]}
    >
      {children}
    </BackofficeSection>
  );
}
