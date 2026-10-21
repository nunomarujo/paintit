import 'server-only';
import { adminClient } from '@/lib/supabase/admin';
import { stripeConfigured } from '@/lib/stripe';

export interface Check {
  label: string;
  ok: boolean;
  detail: string;
}

/**
 * Estado das ligações do servidor, para a equipa da plataforma. Nunca devolve valores de chaves:
 * só se existem e se funcionam.
 */
export async function serverChecks(userEngagementCount: number): Promise<Check[]> {
  const out: Check[] = [];
  const db = adminClient();
  if (!db) {
    out.push({ label: 'Chave secreta do Supabase', ok: false, detail: 'SUPABASE_SECRET_KEY não está definida neste ambiente.' });
  } else {
    const users = await db.auth.admin.listUsers({ page: 1, perPage: 1 });
    if (users.error) {
      out.push({
        label: 'Chave secreta do Supabase',
        ok: false,
        detail: `Recusada pelo Supabase (${users.error.message}). Provavelmente não é a chave secreta do projeto Paint it: confirmar em Supabase → Project Settings → API Keys.`,
      });
    } else {
      const { count, error } = await db.from('engagements').select('id', { count: 'exact', head: true });
      const seen = count ?? 0;
      if (error || seen < userEngagementCount) {
        out.push({
          label: 'Chave secreta do Supabase',
          ok: false,
          detail: `A chave autentica, mas não ignora as políticas de acesso (vê ${seen} contratações; a equipa vê ${userEngagementCount}). É provável que seja a chave pública e não a secreta.${error ? ' ' + error.message : ''}`,
        });
      } else {
        out.push({ label: 'Chave secreta do Supabase', ok: true, detail: `Funciona (vê ${seen} contratações).` });
      }
    }
  }
  out.push({
    label: 'Stripe',
    ok: stripeConfigured && !!process.env.STRIPE_WEBHOOK_SECRET,
    detail: stripeConfigured && process.env.STRIPE_WEBHOOK_SECRET ? 'Chave e segredo do webhook definidos.' : 'Falta STRIPE_SECRET_KEY ou STRIPE_WEBHOOK_SECRET.',
  });
  out.push({
    label: 'Avisos por email (Resend)',
    ok: !!process.env.RESEND_API_KEY,
    detail: process.env.RESEND_API_KEY ? 'Chave definida.' : 'Falta RESEND_API_KEY: os avisos não são enviados.',
  });
  out.push({
    label: 'Devoluções diárias (cron)',
    ok: !!process.env.CRON_SECRET,
    detail: process.env.CRON_SECRET ? 'CRON_SECRET definido.' : 'Falta CRON_SECRET: as devoluções automáticas não correm.',
  });
  out.push({
    label: 'Aceitação simples do contrato',
    ok: process.env.PERMITIR_ACEITACAO_SIMPLES !== '1',
    detail:
      process.env.PERMITIR_ACEITACAO_SIMPLES === '1'
        ? 'LIGADA (só para testes): desligar antes de abrir ao público.'
        : 'Desligada: o contrato exige PDF assinado com Chave Móvel Digital.',
  });
  return out;
}
