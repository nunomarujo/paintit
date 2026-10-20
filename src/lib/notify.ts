import 'server-only';
import { BRAND } from '@/config/brand';
import { CURRENT_RULES } from '@/domain/rules';
import { engagementNotices, NEW_PROPOSAL_NOTICE } from '@/domain/notifications';
import type { EngagementStatus } from '@/domain/engagement';
import { adminClient } from '@/lib/supabase/admin';

// Avisos por email (Resend). Só funcionam com RESEND_API_KEY e SUPABASE_SECRET_KEY no ambiente;
// sem elas não fazem nada. Nunca devem fazer falhar a ação do utilizador: quem chama ignora erros.

const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function html(subject: string, lines: string[], link: string) {
  return `<!doctype html><html lang="pt-PT"><body style="margin:0;background:#f6f5f0;font-family:Inter,Arial,sans-serif;color:#172c35">
<div style="max-width:520px;margin:0 auto;padding:28px 20px">
<p style="font-size:20px;font-weight:700;color:#173f42;margin:0 0 20px">${escapeHtml(BRAND.name)}</p>
<div style="background:#fff;border:1px solid #e1e5de;border-radius:14px;padding:24px">
<h1 style="font-size:18px;margin:0 0 12px">${escapeHtml(subject)}</h1>
${lines.map((l) => `<p style="margin:0 0 10px;line-height:1.5">${escapeHtml(l)}</p>`).join('')}
<p style="margin:20px 0 0"><a href="${escapeHtml(link)}" style="display:inline-block;background:#c4572f;color:#fff;text-decoration:none;font-weight:600;padding:12px 20px;border-radius:8px">Abrir na plataforma</a></p>
</div>
<p style="font-size:12px;color:#62716c;margin:16px 0 0">Aviso automático de ${escapeHtml(BRAND.name)}. Dúvidas: ${escapeHtml(BRAND.email)}.</p>
</div></body></html>`;
}

async function sendEmail(to: string[], subject: string, lines: string[], path: string): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  if (!key || to.length === 0) return;
  const link = `${BRAND.url}${path}`;
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: `${BRAND.name} <${BRAND.email}>`,
      to,
      subject: `${BRAND.name} · ${subject}`,
      html: html(subject, lines, link),
      text: `${subject}\n\n${lines.join('\n')}\n\n${link}`,
    }),
  });
  if (!res.ok) console.error('Resend recusou o aviso:', res.status, await res.text().catch(() => ''));
}

/** Emails dos proprietários e gestores da entidade (e da administradora que a gere). */
async function recipients(orgId: string): Promise<string[]> {
  const db = adminClient();
  if (!db) return [];
  const { data: org } = await db.from('organizations').select('id, gerida_por').eq('id', orgId).maybeSingle();
  const orgIds = [orgId, ...(org?.gerida_por ? [org.gerida_por] : [])];
  const { data: members } = await db.from('org_members').select('user_id').in('org_id', orgIds).in('role', ['proprietario', 'gestor']);
  const emails = await Promise.all(
    [...new Set((members ?? []).map((m) => m.user_id))].map(async (id) => (await db.auth.admin.getUserById(id)).data.user?.email ?? null),
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
  await Promise.all(
    notices.map(async (n) =>
      sendEmail(await recipients(n.to === 'cliente' ? e.client_org_id : e.painter_org_id), n.subject, n.lines, `/app/contratacoes/${engagementId}`),
    ),
  );
}

export async function notifyProposalSubmitted(requestId: string): Promise<void> {
  const db = adminClient();
  if (!db) return;
  const { data: req } = await db.from('work_requests').select('org_id, titulo').eq('id', requestId).maybeSingle();
  if (!req) return;
  const n = NEW_PROPOSAL_NOTICE(req.titulo);
  await sendEmail(await recipients(req.org_id), n.subject, n.lines, `/app/pedidos/${requestId}/propostas`);
}
