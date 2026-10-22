import { pendingEngagements } from '@/lib/backofficeCounts';
import { getUser } from '@/lib/supabase/server';
import { EngagementList } from '../List';

export default async function AllEngagementsPage() {
  const { supabase } = await getUser();
  const items = await pendingEngagements(supabase);
  return <EngagementList items={items} empty="Ainda não há contratações. Uma contratação começa quando o cliente escolhe uma proposta." />;
}
