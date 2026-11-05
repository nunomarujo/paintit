import 'server-only';
import { FATURA_NOTICE } from '@/domain/notifications';
import { formatEuros } from '@/domain/money';
import type { InvoiceDraft } from '@/domain/invoicing';
import { emitInvoice, type EmitResult } from '@/lib/invoicing';
import { recipients, sendEmail } from '@/lib/notify';
import { adminClient } from '@/lib/supabase/admin';

/**
 * A fatura emitida chega a quem a deve (05/11/2026): email com o PDF em anexo para os proprietários e gestores da
 * entidade (e da administradora que a gere), logo a seguir à emissão, e uma linha em `fiscal_document_envios` por
 * destinatário — para o backoffice ver se chegou e reenviar se não. O envio nunca desfaz a emissão: o documento
 * fiscal já existe na Moloni, e uma falha de email só se regista.
 */
export async function enviarFatura(documentId: string): Promise<{ ok: boolean; message: string }> {
  const db = adminClient();
  if (!db) return { ok: false, message: 'Sem chave do Supabase.' };
  const { data: d } = await db.from('fiscal_documents').select('id, tipo, numero, total_cents, data, reason, org_id, pdf_path, estado').eq('id', documentId).maybeSingle();
  if (!d || d.estado !== 'emitido') return { ok: false, message: 'Documento não emitido.' };
  if (!d.org_id) return { ok: false, message: 'Este documento não tem entidade associada: não há a quem o enviar.' };
  if (!d.pdf_path) return { ok: false, message: 'A Moloni ainda não devolveu o PDF deste documento.' };

  const para = await recipients(d.org_id);
  if (para.length === 0) return { ok: false, message: 'A entidade não tem proprietário nem gestor com email.' };

  const { data: ficheiro, error: erroPdf } = await db.storage.from('documentos-fiscais').download(d.pdf_path);
  if (erroPdf || !ficheiro) return { ok: false, message: 'Não foi possível ler o PDF guardado.' };
  const pdf = new Uint8Array(await ficheiro.arrayBuffer());

  const descricao = { comissao: 'comissão de sucesso', subscricao: 'subscrição', caucao_retida: 'caução retida' }[d.reason as 'comissao' | 'subscricao' | 'caucao_retida'] ?? 'serviço';
  const n = FATURA_NOTICE({
    tipo: d.tipo as 'FT' | 'NC',
    numero: d.numero,
    total: formatEuros(d.total_cents),
    data: d.data.split('-').reverse().join('/'),
    descricao,
  });
  const nome = `${d.tipo === 'NC' ? 'nota-de-credito' : 'fatura'}${d.numero ? `-${d.numero.replace(/[^A-Za-z0-9]+/g, '-')}` : ''}.pdf`;
  const ok = await sendEmail(para, n.subject, n.lines, '/app/faturas', { exactSubject: false, cta: 'Ver as faturas', attachments: [{ filename: nome, content: pdf }] });

  await db.from('fiscal_document_envios').insert(
    para.map((p) => ({ document_id: d.id, para: p, estado: ok ? 'enviado' : 'falhou', erro: ok ? null : 'O Resend recusou o email ou não está configurado.' })),
  );
  return ok ? { ok: true, message: `Enviada a ${para.length} destinatário(s).` } : { ok: false, message: 'O email não saiu: a fatura fica emitida e pode reenviar-se.' };
}

/** Emite e, se acabou de emitir, envia. É esta a função que o backoffice chama. */
export async function emitirEEnviar(draft: InvoiceDraft): Promise<EmitResult> {
  const r = await emitInvoice(draft);
  if (!r.ok || !r.novoDocumento) return r;
  const envio = await enviarFatura(r.novoDocumento).catch((e: unknown) => ({ ok: false, message: e instanceof Error ? e.message : String(e) }));
  return { ...r, message: `${r.message} ${envio.ok ? envio.message : `Não enviada: ${envio.message}`}` };
}
