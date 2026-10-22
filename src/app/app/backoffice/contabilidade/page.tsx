import { redirect } from 'next/navigation';
import { Dashboard } from './sections';

const OLD = ['movimentos', 'reconciliacao', 'banco', 'pagar', 'periodos'];

export default async function AccountingDashboard({ searchParams }: { searchParams: Promise<{ v?: string }> }) {
  // Endereços antigos (?v=…) passam para os sub-separadores.
  const { v } = await searchParams;
  if (v && OLD.includes(v)) redirect(`/app/backoffice/contabilidade/${v}`);
  return <Dashboard />;
}
