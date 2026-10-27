import 'server-only';
import { BRAND } from '@/config/brand';
import { CURRENT_RULES } from '@/domain/rules';
import { COBRANCA_NOTICES, JANELA_ABRIU_NOTICE, JANELA_ACABA_NOTICE, NEW_PROPOSAL_NOTICE, NEW_REQUEST_NOTICE, REFERRAL_NOTICES, SEGUIMENTO_NOTICES, SUPPLIER_INVITE_NOTICE, engagementNotices } from '@/domain/notifications';
import { ehEmail, fimDaJanela } from '@/domain/toques';
import { resumoDaSemana } from '@/domain/semana';
import { DOC_KIND_LABELS, type DocKind } from '@/domain/organization';
import { temPro, type SubscricaoPintor } from '@/domain/painterPlan';
import { formatEuros } from '@/domain/money';
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
  /** Ligações secundárias, pequenas, por baixo do botão principal (ex.: "Como funciona", FAQ). */
  links?: { label: string; href: string }[];
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
${o.links && o.links.length > 0 ? `<p style="margin:12px 0 0;font-size:13px">${o.links.map((l) => `<a href="${escapeHtml(l.href)}" style="color:#173f42;text-decoration:underline">${escapeHtml(l.label)}</a>`).join(' &nbsp;·&nbsp; ')}</p>` : ''}
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

/** Convite de adesão enviado por um fornecedor a um pintor que ainda não está na plataforma — único
 * caso nesta lista em que o destinatário vem direto do formulário (navegador), não de `recipients()`:
 * é precisamente a pessoa que ainda não tem conta nenhuma para resolver. Por isso aponta também, a par do
 * botão principal, para a página inicial pública ("Como funciona", perguntas frequentes) — quem recebe
 * nunca viu a plataforma e pode querer confirmar o que é antes de aceitar. */
export async function notifySupplierInvite(email: string, fornecedorNome: string, remetenteNome: string | null, code: string): Promise<void> {
  const n = SUPPLIER_INVITE_NOTICE({ fornecedor: fornecedorNome, remetente: remetenteNome });
  await sendEmail([email], n.subject, n.lines, `/convite-fornecedor/${code}`, {
    cta: 'Aceitar o convite e começar',
    links: [
      { label: 'Como funciona', href: `${BRAND.url}/#como-funciona` },
      { label: 'Perguntas frequentes', href: `${BRAND.url}/#perguntas` },
    ],
  });
}

export async function notifyEngagementChange(engagementId: string, before: EngagementStatus, after: EngagementStatus): Promise<void> {
  const notices = engagementNotices(before, after, CURRENT_RULES.feeDeadlineDays);
  await notifyReferralProgress(engagementId).catch(() => undefined);
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

/**
 * Os avisos da janela de esclarecimentos, enviados pela tarefa diária.
 *
 * Ao pintor vão só os que têm proposta neste pedido — e um de cada vez, por causa do limite do
 * Resend. Quem decide se este toque é devido é `toquesDevidos`; aqui só se escreve e se envia.
 */
export async function notifyJanela(tipo: 'janela_abriu' | 'janela_acaba', requestId: string, para: 'cliente' | 'pintor'): Promise<void> {
  const db = adminClient();
  if (!db) return;
  const { data: req } = await db.from('work_requests').select('org_id, titulo, prazo_propostas').eq('id', requestId).maybeSingle();
  if (!req?.prazo_propostas) return;
  const ate = fimDaJanela(req.prazo_propostas).split('-').reverse().join('/');

  if (para === 'cliente') {
    const n = tipo === 'janela_abriu'
      ? JANELA_ABRIU_NOTICE({ titulo: req.titulo, ate, para: 'cliente' })
      : JANELA_ACABA_NOTICE({ titulo: req.titulo, ate });
    await sendEmail(await recipients(req.org_id), n.subject, n.lines, `/app/pedidos/${requestId}/propostas`);
    return;
  }

  const { data: props } = await db.from('proposals').select('painter_org_id').eq('request_id', requestId).neq('status', 'rascunho');
  const n = JANELA_ABRIU_NOTICE({ titulo: req.titulo, ate, para: 'pintor' });
  for (const orgId of [...new Set((props ?? []).map((p) => p.painter_org_id))]) {
    await sendEmail(await recipients(orgId), n.subject, n.lines, `/app/oportunidades`);
  }
}

/**
 * Um toque do seguimento, escrito ao cliente do pintor.
 *
 * Vai ao contacto que o pintor guardou no orçamento, e só quando esse contacto é um email — um
 * número de telefone não se usa para isto. O link aponta para a página pública da plataforma: quem
 * recebe não tem conta nenhuma, e mandá-lo para um ecrã de entrada seria mandá-lo para uma porta
 * fechada.
 */
export async function notifySeguimento(tipo: 'orcamento_1' | 'orcamento_2' | 'orcamento_3', quoteId: string): Promise<void> {
  const db = adminClient();
  if (!db) return;
  const { data: q } = await db
    .from('painter_quotes')
    .select('cliente_contacto, titulo, validade, org_id')
    .eq('id', quoteId)
    .maybeSingle();
  if (!q?.cliente_contacto || !ehEmail(q.cliente_contacto)) return;
  const { data: org } = await db.from('organizations').select('nome').eq('id', q.org_id).maybeSingle();
  if (!org) return;

  const pintor = org.nome;
  const titulo = q.titulo;
  const n =
    tipo === 'orcamento_1'
      ? SEGUIMENTO_NOTICES.orcamento_1({ pintor, titulo })
      : tipo === 'orcamento_2'
        ? SEGUIMENTO_NOTICES.orcamento_2({ pintor, titulo, validade: q.validade ? q.validade.split('-').reverse().join('/') : null })
        : SEGUIMENTO_NOTICES.orcamento_3({ pintor, titulo });

  await sendEmail([q.cliente_contacto], n.subject, n.lines, '/', {
    exactSubject: true,
    cta: 'Saber o que é a Quem Pinta',
    footer: `Mensagem enviada por ${BRAND.name} a pedido de ${pintor}.`,
  });
}

/**
 * Um lembrete de cobrança. Os três primeiros vão ao cliente da obra; o quarto, ao fim de um mês, vai
 * ao próprio pintor — e esse não leva nome de ninguém, porque é interno.
 */
export async function notifyCobranca(
  tipo: 'cobranca_1' | 'cobranca_2' | 'cobranca_3' | 'cobranca_pintor',
  trancheId: string,
): Promise<void> {
  const db = adminClient();
  if (!db) return;
  const { data: t } = await db
    .from('worksite_entries')
    .select('valor_cents, prevista, worksite_id, painter_org_id')
    .eq('id', trancheId)
    .maybeSingle();
  if (!t?.prevista || t.valor_cents == null) return;
  const { data: obra } = await db.from('worksites').select('nome, cliente_contacto').eq('id', t.worksite_id).maybeSingle();
  if (!obra) return;

  const valor = formatEuros(t.valor_cents);
  const data = t.prevista.split('-').reverse().join('/');

  if (tipo === 'cobranca_pintor') {
    const n = COBRANCA_NOTICES.cobranca_pintor({ obra: obra.nome, valor, data });
    await sendEmail(await recipients(t.painter_org_id), n.subject, n.lines, `/app/obras/${t.worksite_id}?s=financeiro`);
    return;
  }

  if (!ehEmail(obra.cliente_contacto)) return;
  const { data: org } = await db.from('organizations').select('nome').eq('id', t.painter_org_id).maybeSingle();
  if (!org) return;
  const n = COBRANCA_NOTICES[tipo]({ pintor: org.nome, obra: obra.nome, valor, data });
  await sendEmail([obra.cliente_contacto!], n.subject, n.lines, '/', {
    exactSubject: true,
    cta: 'Saber o que é a Quem Pinta',
    footer: `Mensagem enviada por ${BRAND.name} a pedido de ${org.nome}.`,
  });
}

/**
 * O email de segunda-feira de uma empresa de pintura. Devolve `true` se chegou a sair alguma coisa.
 *
 * Junta o que é dela e está a mexer: o que está na rua, o que vence esta semana, os orçamentos sem
 * resposta e os papéis a caducar. Se não houver nada, não se envia nada — um email semanal garantido
 * é publicidade, e a publicidade semanal ensina a apagar sem abrir.
 */
export async function notifySemana(orgId: string, hoje: string): Promise<boolean> {
  const db = adminClient();
  if (!db) return false;

  const seteDias = new Date(new Date(`${hoje}T00:00:00Z`).getTime() + 7 * 86_400_000).toISOString().slice(0, 10);
  const trintaDias = new Date(new Date(`${hoje}T00:00:00Z`).getTime() + 30 * 86_400_000).toISOString().slice(0, 10);

  const [{ data: tranches }, { data: orcamentos }, { data: docs }, { data: sub }] = await Promise.all([
    db.from('worksite_entries').select('valor_cents, prevista').eq('painter_org_id', orgId).eq('tipo', 'tranche').is('recebida_em', null),
    db.from('painter_quotes').select('enviado_em').eq('org_id', orgId).eq('estado', 'enviado'),
    db.from('org_documents').select('kind, valido_ate').eq('org_id', orgId).not('valido_ate', 'is', null).lte('valido_ate', trintaDias).gte('valido_ate', hoje),
    db
      .from('org_subscriptions')
      .select('plano, estado, periodicidade, valida_ate, preco_cents')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const comData = (tranches ?? []).filter((t): t is { valor_cents: number; prevista: string } => !!t.prevista && t.valor_cents != null);
  const resumo = resumoDaSemana(
    {
      emAtraso: comData.filter((t) => t.prevista < hoje).map((t) => ({ valorCents: t.valor_cents, prevista: t.prevista })),
      aVencer: comData.filter((t) => t.prevista >= hoje && t.prevista <= seteDias).map((t) => ({ valorCents: t.valor_cents, prevista: t.prevista })),
      orcamentosAEspera: (orcamentos ?? []).filter((q) => q.enviado_em).map((q) => ({ enviadoEm: q.enviado_em!.slice(0, 10) })),
      documentosACaducar: (docs ?? []).map((d) => ({ nome: DOC_KIND_LABELS[d.kind as DocKind] ?? d.kind, validoAte: d.valido_ate! })),
      // A mesma regra do resto da aplicação, não uma segunda leitura do plano aqui.
      pro: temPro(sub as SubscricaoPintor | null, hoje),
    },
    hoje,
  );
  if (resumo.vazio) return false;

  await sendEmail(await recipients(orgId), 'A sua semana', resumo.linhas, '/app', { cta: 'Abrir a aplicação' });
  return true;
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

/**
 * Mensagem nova numa proposta, antes da apresentação (COM-05): avisa só quem a não escreveu, sem identificar
 * quem a escreveu mais do que o anúncio anónimo já permite, e sem repetir o texto no email (já passou pelo
 * filtro de contactos — guardContact — mas não há razão para o email repetir conteúdo gerado pelo utilizador).
 */
export async function notifyNewMessage(proposalId: string, lado: 'cliente' | 'pintor'): Promise<void> {
  const db = adminClient();
  if (!db) return;
  const { data: p } = await db.from('proposals').select('request_id, painter_org_id').eq('id', proposalId).maybeSingle();
  if (!p) return;
  const { data: req } = await db.from('work_requests').select('org_id, titulo').eq('id', p.request_id).maybeSingle();
  if (!req) return;
  if (lado === 'pintor') {
    await sendEmail(
      await recipients(req.org_id),
      'Nova mensagem numa proposta',
      [`Uma das propostas para «${req.titulo}» tem uma pergunta ou mensagem nova.`],
      `/app/pedidos/${p.request_id}/propostas`,
    );
  } else {
    await sendEmail(
      await recipients(p.painter_org_id),
      'Nova mensagem do cliente',
      [`Há uma mensagem nova numa das suas propostas, para «${req.titulo}».`],
      `/app/oportunidades/${p.request_id}`,
    );
  }
}

/** Quando o cliente avalia a obra pela primeira vez (COM-05, "avaliação"): a empresa de pintura sabe que tem
 * uma avaliação nova, sem repetir aqui a nota nem o comentário — abre a contratação para os ver. */
export async function notifyNewReview(engagementId: string): Promise<void> {
  const db = adminClient();
  if (!db) return;
  const { data: e } = await db.from('engagements').select('painter_org_id').eq('id', engagementId).maybeSingle();
  if (!e) return;
  await sendEmail(await recipients(e.painter_org_id), 'Avaliação nova', ['O cliente avaliou esta obra.'], `/app/contratacoes/${engagementId}`);
}

/** Quando o pintor encomenda um produto (COM-05, "compra confirmada" começa aqui): o fornecedor sabe que tem
 * uma encomenda nova por confirmar, em /app/encomendas. */
export async function notifyNewOrder(orderId: string): Promise<void> {
  const db = adminClient();
  if (!db) return;
  const { data: o } = await db.from('material_orders').select('supplier_org_id').eq('id', orderId).maybeSingle();
  if (!o) return;
  await sendEmail(await recipients(o.supplier_org_id), 'Encomenda nova', ['Um pintor encomendou um produto do seu catálogo.'], '/app/encomendas');
}

const ORDER_STATE_NOTICE: Record<string, { subject: string; line: string }> = {
  confirmada: { subject: 'Encomenda confirmada', line: 'O fornecedor confirmou a venda do produto encomendado.' },
  entregue: { subject: 'Encomenda entregue', line: 'O fornecedor marcou o produto encomendado como entregue em obra.' },
  cancelada: { subject: 'Encomenda cancelada', line: 'O fornecedor cancelou a encomenda do produto.' },
};

/** O fornecedor muda o estado de uma encomenda (só ele o pode fazer, de /app/encomendas): o pintor sabe. */
export async function notifyOrderState(orderId: string, estado: string): Promise<void> {
  const notice = ORDER_STATE_NOTICE[estado];
  const db = adminClient();
  if (!notice || !db) return;
  const { data: o } = await db.from('material_orders').select('engagement_id, painter_org_id').eq('id', orderId).maybeSingle();
  if (!o) return;
  await sendEmail(await recipients(o.painter_org_id), notice.subject, [notice.line], `/app/obras/${o.engagement_id}`);
}

/** Quando o pintor avalia um fornecedor pela primeira vez (COM-05, "avaliação"): o fornecedor sabe. */
export async function notifyNewSupplierReview(supplierOrgId: string): Promise<void> {
  await sendEmail(await recipients(supplierOrgId), 'Avaliação nova', ['Um pintor avaliou a sua empresa.'], `/app/organizacoes/${supplierOrgId}`);
}

const euro = (cents: number) => formatEuros(cents);
const SUPPLIER_PATH = (orgId: string) => `/app/organizacoes/${orgId}/adesoes`;

/** Quando uma proposta com código de adesão é submetida: o fornecedor sabe que houve candidatura. */
export async function notifyReferralCandidacy(proposalId: string): Promise<void> {
  const db = adminClient();
  if (!db) return;
  const { data: p } = await db.from('proposals').select('referral_code_id, painter_org_id, request_id').eq('id', proposalId).maybeSingle();
  if (!p?.referral_code_id) return;
  const [{ data: code }, { data: painter }, { data: listing }] = await Promise.all([
    db.from('referral_codes').select('supplier_org_id').eq('id', p.referral_code_id).maybeSingle(),
    db.from('organizations').select('nome').eq('id', p.painter_org_id).maybeSingle(),
    db.from('request_listings').select('concelho').eq('request_id', p.request_id).maybeSingle(),
  ]);
  if (!code) return;
  const n = REFERRAL_NOTICES.candidatura({ pintor: painter?.nome ?? 'Um pintor', concelho: listing?.concelho ?? 'Portugal' });
  await sendEmail(await recipients(code.supplier_org_id), n.subject, n.lines, SUPPLIER_PATH(code.supplier_org_id));
}

/** Escolha da proposta: o fornecedor sabe que ganhou, e quanto. */
export async function notifyReferralWon(proposalId: string): Promise<void> {
  const db = adminClient();
  if (!db) return;
  const { data: pay } = await db.from('referral_payouts').select('supplier_org_id, amount_cents').eq('proposal_id', proposalId).maybeSingle();
  if (!pay) return;
  const { data: p } = await db.from('proposals').select('painter_org_id').eq('id', proposalId).maybeSingle();
  const { data: painter } = p ? await db.from('organizations').select('nome').eq('id', p.painter_org_id).maybeSingle() : { data: null };
  const n = REFERRAL_NOTICES.ganhou({ pintor: painter?.nome ?? 'O pintor', comissao: euro(pay.amount_cents) });
  await sendEmail(await recipients(pay.supplier_org_id), n.subject, n.lines, SUPPLIER_PATH(pay.supplier_org_id));
}

/** Quando a plataforma recebe a comissão do pintor: pede-se a fatura e o IBAN (uma só vez). */
export async function notifyReferralProgress(engagementId: string): Promise<void> {
  const db = adminClient();
  if (!db) return;
  const { data: pay } = await db.from('referral_payouts').select('id, supplier_org_id, amount_cents, fee_recebido_em, fee_avisado').eq('engagement_id', engagementId).maybeSingle();
  if (!pay?.fee_recebido_em || pay.fee_avisado) return;
  await db.from('referral_payouts').update({ fee_avisado: true }).eq('id', pay.id);
  const n = REFERRAL_NOTICES.feeRecebido({ comissao: euro(pay.amount_cents) });
  await sendEmail(await recipients(pay.supplier_org_id), n.subject, n.lines, SUPPLIER_PATH(pay.supplier_org_id));
}

export async function notifyReferralPaid(redemptionId: string): Promise<void> {
  const db = adminClient();
  if (!db) return;
  const { data: r } = await db.from('referral_redemptions').select('supplier_org_id, liquido_cents, referencia_pagamento').eq('id', redemptionId).maybeSingle();
  if (!r) return;
  const n = REFERRAL_NOTICES.paga({ comissao: euro(r.liquido_cents), referencia: r.referencia_pagamento ?? '' });
  await sendEmail(await recipients(r.supplier_org_id), n.subject, n.lines, SUPPLIER_PATH(r.supplier_org_id));
}
