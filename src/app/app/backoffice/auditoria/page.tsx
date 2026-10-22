import { redirect } from 'next/navigation';

export default function AuditRedirect() {
  redirect('/app/backoffice/sistema/auditoria');
}
