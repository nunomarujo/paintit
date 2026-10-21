import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { FormState } from '@/app/app/actions';
import { revealingContent } from '@/domain/request';
import { strikeLevel, type StrikeInfo } from '@/domain/strikes';
import type { Database } from '@/lib/database.types';
import { adminClient } from '@/lib/supabase/admin';

type Admin = NonNullable<ReturnType<typeof adminClient>>;

/** Regista uma tentativa de partilhar contactos e devolve em que aviso está (e bloqueia à terceira). */
export async function registerContactAttempt(p: { userId: string; onde: string; texto: string; motivos: string[] }): Promise<StrikeInfo | null> {
  const db = adminClient();
  if (!db) return null;
  await db.from('contact_violations').insert({ user_id: p.userId, onde: p.onde, motivos: p.motivos, texto: p.texto.slice(0, 2000) });
  const { count } = await db
    .from('contact_violations')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', p.userId)
    .is('anulada_em', null);
  const info = strikeLevel(count ?? 1);
  if (info.level === 'bloqueada') await blockUser(db, p.userId, `Terceira tentativa de partilhar contactos (${p.onde}).`);
  return info;
}

async function blockUser(db: Admin, userId: string, motivo: string) {
  await db.from('blocked_users').upsert({ user_id: userId, motivo });
  // Os NIF das entidades da conta ficam impedidos de se registar de novo.
  const { data: orgs } = await db.from('org_members').select('organizations(nif)').eq('user_id', userId);
  const nifs = [...new Set((orgs ?? []).map((o) => (o.organizations as { nif: string | null } | null)?.nif).filter((n): n is string => !!n))];
  if (nifs.length > 0) await db.from('blocked_identifiers').upsert(nifs.map((nif) => ({ nif, user_id: userId })));
  // Sem sessões novas nem renovação das atuais.
  await db.auth.admin.updateUserById(userId, { ban_duration: '876000h' });
}

/** Desbloqueio pela equipa da plataforma: anula os avisos e volta a permitir a entrada. */
export async function unblockUser(userId: string) {
  const db = adminClient();
  if (!db) return false;
  await db.from('blocked_identifiers').delete().eq('user_id', userId);
  await db.from('blocked_users').delete().eq('user_id', userId);
  await db.from('contact_violations').update({ anulada_em: new Date().toISOString() }).eq('user_id', userId).is('anulada_em', null);
  await db.auth.admin.updateUserById(userId, { ban_duration: 'none' });
  return true;
}

/**
 * Resposta de uma ação que recusou um texto com contactos: o erro do campo e o aviso (popup).
 * À terceira tentativa a sessão é terminada.
 */
export async function contactAttemptState(
  supabase: SupabaseClient<Database>,
  userId: string,
  onde: string,
  texto: string,
  motivos: string[],
  errors: FormState['errors'],
): Promise<FormState> {
  const strike = await registerContactAttempt({ userId, onde, texto, motivos });
  if (strike?.level === 'bloqueada') await supabase.auth.signOut();
  return { errors, strike: strike ?? undefined };
}

/**
 * Recusa e regista, como aviso, qualquer texto com contactos, localização ou convite para sair da plataforma.
 * Devolve null se os textos estão em ordem.
 */
export async function guardContact(
  supabase: SupabaseClient<Database>,
  userId: string,
  onde: string,
  fields: Record<string, string | null | undefined>,
): Promise<FormState | null> {
  const errors: FormState['errors'] = {};
  const motivos = new Set<string>();
  const texts: string[] = [];
  for (const [field, text] of Object.entries(fields)) {
    if (!text) continue;
    const found = revealingContent(text);
    if (found.length === 0) continue;
    errors[field] = `Retire ${found.join(', ')}: os contactos só são trocados depois da apresentação.`;
    found.forEach((m) => motivos.add(m));
    texts.push(text);
  }
  if (motivos.size === 0) return null;
  return contactAttemptState(supabase, userId, onde, texts.join('\n---\n'), [...motivos], errors);
}
