import Link from 'next/link';
import { formatEuros } from '@/domain/money';
import { INVOICE_REASONS, invoiceTotal } from '@/domain/invoicing';
import { moloniConfigured } from '@/lib/moloni';
import { pendingInvoices } from '@/lib/invoicing';
import { getUser } from '@/lib/supabase/server';
import { EmitAllButton, EmitOneButton } from '../FaturacaoForms';

const card = 'rounded-2xl border border-slate-200 bg-white p-6';
const REASON_LABELS: Record<string, string> = { comissao: 'Comissão de sucesso (pintor)', subscricao: 'Subscrição (fornecedor)', caucao_retida: 'Caução retida (cliente)' };
const ptDate = (iso: string) => iso.slice(0, 10).split('-').reverse().join('/');

export default async function InvoicingPage() {
  const { supabase } = await getUser();
  const [pending, { data: emitted }, { data: failed }] = await Promise.all([
    pendingInvoices(),
    supabase.from('fiscal_documents').select('*').eq('estado', 'emitido').order('emitido_em', { ascending: false }).limit(20),
    supabase.from('fiscal_documents').select('*').eq('estado', 'falhou').order('created_at', { ascending: false }),
  ]);
  const links = new Map<string, string>();
  for (const d of emitted ?? []) {
    if (!d.pdf_path) continue;
    const { data: signed } = await supabase.storage.from('documentos-fiscais').createSignedUrl(d.pdf_path, 600);
    if (signed?.signedUrl) links.set(d.id, signed.signedUrl);
  }
  return (
    <div className="space-y-6">
      {!moloniConfigured && (
        <p className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          A faturação (Moloni) ainda não está configurada: faltam as variáveis <code>MOLONI_*</code> na Vercel. Esta página mostra o que falta faturar, mas «Emitir» não funciona até lá. Ver{' '}
          <code>docs/FATURACAO.md</code>.
        </p>
      )}
      <section className={card}>
        <h2 className="font-semibold">Documentos pendentes ({pending.length})</h2>
        <p className="mt-1 text-sm text-slate-600">Calculado a partir dos pagamentos confirmados que ainda não têm fatura. Emitir chama a Moloni e grava o resultado; uma falha fica registada para se repetir.</p>
        {pending.length > 0 && (
          <div className="mt-4">
            <EmitAllButton />
          </div>
        )}
        {pending.length === 0 ? (
          <p className="mt-3 text-sm text-slate-600">Nada por faturar.</p>
        ) : (
          <ul className="mt-4 divide-y divide-slate-100 text-sm">
            {pending.map((d) => (
              <li key={`${d.originType}-${d.originId}`} className="py-3">
                <p>
                  <b>{d.customer.nome}</b> {d.customer.nif ? `(NIF ${d.customer.nif})` : '(sem NIF)'} · {REASON_LABELS[d.reason]} · {d.tipo} · {ptDate(d.data)} · {formatEuros(invoiceTotal(d.lines))}
                </p>
                <EmitOneButton originType={d.originType} originId={d.originId} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {(failed ?? []).length > 0 && (
        <section className={card}>
          <h2 className="font-semibold">Falhas por corrigir ({(failed ?? []).length})</h2>
          <ul className="mt-3 divide-y divide-slate-100 text-sm">
            {(failed ?? []).map((d) => (
              <li key={d.id} className="py-3">
                <p>
                  <b>{d.cliente_nome}</b> · {REASON_LABELS[d.reason]} · {d.tipo} · {ptDate(d.data)} · {formatEuros(d.total_cents)}
                </p>
                <p className="text-xs text-red-700">{d.erro}</p>
                <EmitOneButton originType={d.origin_type} originId={d.origin_id} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className={card}>
        <h2 className="font-semibold">Últimos documentos emitidos</h2>
        {(emitted ?? []).length === 0 ? (
          <p className="mt-2 text-sm text-slate-600">Ainda nenhum.</p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-100 text-sm">
            {(emitted ?? []).map((d) => (
              <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span>
                  {d.tipo} {d.numero ?? d.provider_document_id} · {d.cliente_nome} · {formatEuros(d.total_cents)} · {d.emitido_em ? ptDate(d.emitido_em) : ''}
                  {d.atcud && <span className="text-slate-500"> · ATCUD {d.atcud}</span>}
                </span>
                {links.get(d.id) ? (
                  <a href={links.get(d.id)} target="_blank" rel="noopener noreferrer" className="text-tinta-700 underline">
                    Abrir PDF
                  </a>
                ) : (
                  <span className="text-slate-400">Sem PDF</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
      <p className="text-xs text-slate-500">Motivos previstos: {INVOICE_REASONS.map((r) => REASON_LABELS[r]).join(', ')}.</p>
      <Link href="/app/backoffice/contabilidade" className="text-sm text-slate-600 hover:underline">
        ← Contabilidade
      </Link>
    </div>
  );
}
