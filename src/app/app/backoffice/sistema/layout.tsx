import type { ReactNode } from 'react';
import { BackofficeSection } from '@/components/BackofficeSection';

export default function SystemLayout({ children }: { children: ReactNode }) {
  return (
    <BackofficeSection
      title="Sistema"
      intro="Ligações do servidor (base de dados, pagamentos, email) e o registo de tudo o que a equipa decidiu, com autor e hora."
      tabs={[
        { href: '/app/backoffice/sistema', label: 'Estado do servidor' },
        { href: '/app/backoffice/sistema/auditoria', label: 'Auditoria' },
      ]}
    >
      {children}
    </BackofficeSection>
  );
}
