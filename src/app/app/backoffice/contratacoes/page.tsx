import { pendingEngagements } from '@/lib/backofficeCounts';
import { getUser } from '@/lib/supabase/server';
import { EngagementList } from './List';

export default async function PendingEngagementsPage() {
  const { supabase } = await getUser();
  const items = (await pendingEngagements(supabase)).filter((i) => i.pending);
  return <EngagementList items={items} empty="Nenhuma contratação espera por uma confirmação da plataforma." />;
}
