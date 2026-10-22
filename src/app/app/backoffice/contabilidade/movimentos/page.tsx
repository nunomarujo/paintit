import { Movements } from '../sections';

export default async function MovementsPage({ searchParams }: { searchParams: Promise<{ mes?: string; origem?: string }> }) {
  const q = await searchParams;
  return <Movements mes={q.mes} origem={q.origem} />;
}
