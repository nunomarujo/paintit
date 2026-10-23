import { pendingEngagements } from '@/lib/backofficeCounts';
import { getUser } from '@/lib/supabase/server';
import { EngagementList } from '../List';

export default async function DisputesPage() {
  const { supabase } = await getUser();
  const items = (await pendingEngagements(supabase)).filter((i) => i.e.status === 'em_litigio');
  return <EngagementList items={items} empty="Nenhuma contratação em litígio." />;
}
