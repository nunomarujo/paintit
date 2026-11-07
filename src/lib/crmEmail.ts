import { COMPANY } from '@/config/company';
import type { EmailRenderizado } from '@/domain/crmEmails';

/**
 * Envia um email do CRM pelo Resend, de um subdomínio próprio (`CRM_REMETENTE`, por exemplo
 * «Nuno · Quem Pinta <nuno@mail.quempinta.pt>») para não pôr em risco a reputação do domínio principal.
 * `CRM_RESPOSTAS_EMAIL` é para onde vão as respostas (por defeito o contacto da empresa).
 * `nao_configurado` quando falta a chave ou o remetente: quem chama deixa o envio como estava.
 */
export async function enviarEmailCrm(para: string, e: EmailRenderizado): Promise<'enviado' | 'falhou' | 'nao_configurado'> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.CRM_REMETENTE;
  if (!key || !from) return 'nao_configurado';
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to: [para],
        // Um endereço só para as respostas das campanhas (CRM_RESPOSTAS_EMAIL), para o que se entrega ao CRM ser só isso.
        reply_to: process.env.CRM_RESPOSTAS_EMAIL || COMPANY.email,
        subject: e.assunto,
        html: e.html,
        text: e.texto,
        headers: { 'List-Unsubscribe': `<${e.linkDeSaida}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
      }),
      signal: AbortSignal.timeout(15_000),
    });
    if (res.ok) return 'enviado';
    console.error('crm: Resend recusou:', res.status, await res.text().catch(() => ''));
    return 'falhou';
  } catch (err) {
    console.error('crm: falha ao enviar:', err);
    return 'falhou';
  }
}
