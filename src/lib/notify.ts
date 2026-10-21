import 'server-only';
import { BRAND } from '@/config/brand';
import { CURRENT_RULES } from '@/domain/rules';
import { engagementNotices, NEW_PROPOSAL_NOTICE, NEW_REQUEST_NOTICE } from '@/domain/notifications';
import { WORK_TYPE_LABELS, type WorkType } from '@/domain/request';
import type { EngagementStatus } from '@/domain/engagement';
import { adminClient } from '@/lib/supabase/admin';

// Avisos por email (Resend). Só funcionam com RESEND_API_KEY e SUPABASE_SECRET_KEY no ambiente;
// sem elas não fazem nada. Nunca devem fazer falhar a ação do utilizador: quem chama ignora erros.

const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

interface MailOptions {
  /** Assunto tal como está, sem o prefixo da marca. */
  exactSubject?: boolean;
  /** Imagem no topo (caminho em /public) e texto do botão. */
  image?: string;
  cta?: string;
  footer?: string;
}

function html(subject: string, lines: string[], link: string, o: MailOptions = {}) {
  return `<!doctype html><html lang="pt-PT"><body style="margin:0;background:#f6f5f0;font-family:Inter,Arial,sans-serif;color:#172c35">
<div style="max-width:520px;margin:0 auto;padding:28px 20px">
<p style="font-size:20px;font-weight:700;color:#173f42;margin:0 0 20px">${escapeHtml(BRAND.name)}<span style="font-weight:400;font-size:13px;color:#62716c"> · ${escapeHtml(BRAND.domain)}</span></p>
<div style="background:#fff;border:1px solid #e1e5de;border-radius:14px;overflow:hidden">
${o.image ? `<a href="${escapeHtml(link)}"><img src="${escapeHtml(BRAND.url + o.image)}" width="520" alt="${escapeHtml(BRAND.name)}: orçamentos de pintura" style="display:block;width:100%;height:auto;border:0"></a>` : ''}
<div style="padding:24px">
<h1 style="font-size:18px;margin:0 0 12px">${escapeHtml(subject)}</h1>
${lines.map((l) => `<p style="margin:0 0 10px;line-height:1.5">${escapeHtml(l)}</p>`).join('')}
<p style="margin:20px 0 0"><a href="${escapeHtml(link)}" style="display:inline-block;background:#c4572f;color:#fff;text-decoration:none;font-weight:600;padding:12px 20px;border-radius:8px">${escapeHtml(o.cta ?? 'Abrir na plataforma')}</a></p>
<p style="margin:14px 0 0;font-size:12px;color:#62716c">Se o botão não abrir: ${escapeHtml(link)}</p>
</div></div>
<p style="font-size:12px;color:#62716c;margin:16px 0 0">${escapeHtml(o.footer ?? `Aviso automático de ${BRAND.name}.`)} Dúvidas: ${escapeHtml(BRAND.email)}.</p>
</div></body></html>`;
}

export async function sendEmail(to: string[], subject: string, lines: string[], path: string, opts: MailOptions = {}): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  if (!key || to.length === 0) return;
  const link = `${BRAND.url}${path}`;
  const body = JSON.stringify({
    from: `${BRAND.name} <${BRAND.email}>`,
    to,
    subject: opts.exactSubject ? subject : `${BRAND.name} · ${subject}`,
    html: html(subject, lines, link, opts),
    text: `${subject}\n\n${lines.join('\n')}\n\n${link}`,
  });
  // O Resend limita os pedidos por segundo (429): repete com uma pausa.
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body,
    });
    if (res.ok) return;
    if (res.status !== 429 || attempt === 2) {
      console.error('Resend recusou o aviso:', res.status, await res.text().catch(() => ''));
      return;
    }
    await new Promise((r) => setTimeout(r, 1200));
  }
}

/** Emails dos proprietários e gestores da entidade (e da administradora que a gere). */
async function recipients(orgId: string, banned: Set<string> = new Set()): Promise<string[]> {
  const db = adminClient();
  if (!db) return [];
  const { data: org } = await db.from('organizations').select('id, gerida_por').eq('id', orgId).maybeSingle();
  const orgIds = [orgId, ...(org?.gerida_por ? [org.gerida_por] : [])];
  const { data: members } = await db.from('org_members').select('user_id').in('org_id', orgIds).in('role', ['proprietario', 'gestor']);
  const emails = await Promise.all(
    [...new Set((members ?? []).map((m) => m.user_id).filter((id) => !banned.has(id)))].map(async (id) => (await db.auth.admin.getUserById(id)).data.user?.email ?? null),
  );
  return [...new Set(emails.filter((e): e is string => !!e))];
}

export async function notifyEngagementChange(engagementId: string, before: EngagementStatus, after: EngagementStatus): Promise<void> {
  const notices = engagementNotices(before, after, CURRENT_RULES.feeDeadlineDays);
  if (notices.length === 0) return;
  const db = adminClient();
  if (!db) return;
  const { data: e } = await db.from('engagements').select('client_org_id, painter_org_id').eq('id', engagementId).maybeSingle();
  if (!e) return;
  // Um de cada vez: evita o limite de pedidos por segundo do Resend.
  for (const n of notices) {
    await sendEmail(await recipients(n.to === 'cliente' ? e.client_org_id : e.painter_org_id), n.subject, n.lines, `/app/contratacoes/${engagementId}`);
  }
}

export async function notifyProposalSubmitted(requestId: string): Promise<void> {
  const db = adminClient();
  if (!db) return;
  const { data: req } = await db.from('work_requests').select('org_id, titulo').eq('id', requestId).maybeSingle();
  if (!req) return;
  const n = NEW_PROPOSAL_NOTICE(req.titulo);
  await sendEmail(await recipients(req.org_id), n.subject, n.lines, `/app/pedidos/${requestId}/propostas`);
}

/**
 * Convida os pintores quando um pedido é publicado: um email por entidade, para o contacto indicado (email_contacto)
 * ou, se não houver, para quem a gere. Só com o que o anúncio anónimo já mostra. Um de cada vez (limite do Resend).
 */
export async function notifyNewRequest(requestId: string): Promise<void> {
  const db = adminClient();
  if (!db) return;
  const { data: l } = await db.from('request_listings').select('concelho, tipo_obra, prazo_propostas, aberto').eq('request_id', requestId).maybeSingle();
  if (!l?.aberto) return;
  const n = NEW_REQUEST_NOTICE({
    concelho: l.concelho,
    tipoObra: WORK_TYPE_LABELS[l.tipo_obra as WorkType] ?? 'Pintura',
    prazo: new Date(`${l.prazo_propostas}T12:00:00Z`).toLocaleDateString('pt-PT', { timeZone: CURRENT_RULES.timeZone }),
  });
  const { data: orgs } = await db.from('organizations').select('id, email_contacto').eq('kind', 'pintor');
  const { data: blocked } = await db.from('blocked_users').select('user_id');
  const banned = new Set((blocked ?? []).map((b) => b.user_id));
  const sent = new Set<string>();
  for (const o of orgs ?? []) {
    const to = o.email_contacto ? [o.email_contacto] : await recipients(o.id, banned);
    const fresh = to.filter((e) => !sent.has(e.toLowerCase()));
    if (fresh.length === 0) continue;
    fresh.forEach((e) => sent.add(e.toLowerCase()));
    await sendEmail(fresh, n.subject, n.lines, `/app/oportunidades/${requestId}`, {
      exactSubject: true,
      image: '/img/email-predio.jpg',
      cta: 'Ver o pedido e orçamentar',
      footer: 'Recebe este aviso por ter uma empresa de pintura registada. Para deixar de receber, responda a este email.',
    });
  }
}
