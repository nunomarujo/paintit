import 'server-only';
import { adminClient } from '@/lib/supabase/admin';

/** Emails das contas, para a equipa saber de quem se trata (só no backoffice). */
export async function emailsOf(ids: string[]): Promise<Map<string, string>> {
  const admin = adminClient();
  const out = new Map<string, string>();
  if (!admin) return out;
  await Promise.all([...new Set(ids)].map(async (id) => out.set(id, (await admin.auth.admin.getUserById(id)).data.user?.email ?? id)));
  return out;
}
