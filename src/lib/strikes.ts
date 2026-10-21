import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { FormState } from '@/app/app/actions';
import { revealingContent } from '@/domain/request';
import { appealEligibility, strikeLevel, type StrikeInfo } from '@/domain/strikes';
import { sendEmail } from '@/lib/notify';
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
  // Um pedido de revisão pendente fica prejudicado pela nova infração.
  await db
    .from('strike_appeals')
    .update({ estado: 'recusada', decisao: 'Prejudicado: houve nova tentativa de partilhar contactos.', decided_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('estado', 'pendente');
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

export interface AppealView {
  strikes: number;
  blocked: boolean;
  /** O 2.º aviso (o único que se pode contestar), se existir. */
  second: { id: string; texto: string; created_at: string } | null;
  appeal: { estado: 'pendente' | 'aceite' | 'recusada'; decisao: string | null; texto: string } | null;
  eligible: boolean;
  reason: string | null;
}

/** Em que ponto está esta conta: avisos ativos, 2.º aviso, pedido de revisão e se o pode fazer. */
export async function appealView(supabase: SupabaseClient<Database>, userId: string): Promise<AppealView> {
  const [{ data: violations }, { data: blocked }, { data: appeals }] = await Promise.all([
    supabase.from('contact_violations').select('id, texto, created_at').eq('user_id', userId).is('anulada_em', null).order('created_at'),
    supabase.from('blocked_users').select('user_id').eq('user_id', userId).maybeSingle(),
    supabase.from('strike_appeals').select('violation_id, estado, decisao, texto').eq('user_id', userId),
  ]);
  const list = violations ?? [];
  const second = list[1] ?? null;
  const appeal = second ? ((appeals ?? []).find((a) => a.violation_id === second.id) ?? null) : null;
  const e = appealEligibility({ activeStrikes: list.length, blocked: !!blocked, appealedSecond: !!appeal });
  return {
    strikes: list.length,
    blocked: !!blocked,
    second,
    appeal: appeal ? { estado: appeal.estado, decisao: appeal.decisao, texto: appeal.texto } : null,
    eligible: e.allowed,
    reason: e.reason,
  };
}

/** Regista o pedido de revisão do 2.º aviso, depois de confirmar que é permitido (nunca pelo que vem do navegador). */
export async function requestAppeal(supabase: SupabaseClient<Database>, userId: string, texto: string): Promise<{ ok: boolean; message: string }> {
  const db = adminClient();
  if (!db) return { ok: false, message: 'Indisponível neste momento.' };
  const view = await appealView(supabase, userId);
  if (!view.eligible || !view.second) return { ok: false, message: view.reason ?? 'Não é possível pedir revisão.' };
  const { error } = await db.from('strike_appeals').insert({ user_id: userId, violation_id: view.second.id, texto });
  if (error) return { ok: false, message: 'Não foi possível registar o pedido.' };
  return { ok: true, message: 'Pedido de revisão enviado. A equipa da plataforma responde por email.' };
}

/**
 * Decisão da equipa da plataforma. Aceitar anula o 2.º aviso (a conta volta a 1 aviso);
 * recusar mantém o último aviso. Em ambos os casos a pessoa recebe a decisão por email.
 */
export async function decideAppeal(appealId: string, accept: boolean, motivo: string, adminId: string): Promise<boolean> {
  const db = adminClient();
  if (!db) return false;
  const { data: a } = await db.from('strike_appeals').select('*').eq('id', appealId).maybeSingle();
  if (!a || a.estado !== 'pendente') return false;
  await db
    .from('strike_appeals')
    .update({ estado: accept ? 'aceite' : 'recusada', decisao: motivo, decided_by: adminId, decided_at: new Date().toISOString() })
    .eq('id', appealId);
  if (accept) await db.from('contact_violations').update({ anulada_em: new Date().toISOString() }).eq('id', a.violation_id);
  const email = (await db.auth.admin.getUserById(a.user_id)).data.user?.email;
  if (email) {
    await sendEmail(
      [email],
      accept ? 'Pedido de revisão aceite' : 'Pedido de revisão recusado',
      accept
        ? ['O segundo aviso foi anulado. A conta fica com um aviso: se voltar a acontecer, conta como segundo aviso.', motivo]
        : ['O segundo aviso mantém-se. A conta continua no último aviso: uma nova tentativa de partilhar contactos bloqueia-a de forma permanente.', motivo],
      '/app',
    ).catch(() => undefined);
  }
  return true;
}
