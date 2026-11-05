import { formatEuros } from '@/domain/money';
import { getUser } from '@/lib/supabase/server';

const ptDate = (iso: string) => iso.slice(0, 10).split('-').reverse().join('/');
const MOTIVO: Record<string, string> = { comissao: 'Comissão de sucesso', subscricao: 'Subscrição', caucao_retida: 'Caução retida' };

/**
 * As faturas que a plataforma emitiu à entidade (05/11/2026). Chegam também por email, com o PDF em anexo; aqui
 * ficam para as reencontrar. A lista filtra pelas entidades de que o utilizador é proprietário ou gestor
 * (`org_members`), não pelo que a política devolveria: a equipa da plataforma vê tudo, e aqui não é esse o ecrã.
 */
export default async function FaturasPage() {
  const { supabase, user } = await getUser();
  const { data: membros } = await supabase.from('org_members').select('org_id').eq('user_id', user!.id).in('role', ['proprietario', 'gestor']);
  const orgs = (membros ?? []).map((m) => m.org_id);
  const { data: faturas } = orgs.length
    ? await supabase.from('fiscal_documents').select('id, tipo, numero, reason, data, total_cents, pdf_path, cliente_nome').in('org_id', orgs).eq('estado', 'emitido').order('data', { ascending: false }).limit(100)
    : { data: [] };

  const links = new Map<string, string>();
  for (const f of faturas ?? []) {
    if (!f.pdf_path) continue;
    const { data: assinado } = await supabase.storage.from('documentos-fiscais').createSignedUrl(f.pdf_path, 600);
    if (assinado?.signedUrl) links.set(f.id, assinado.signedUrl);
  }

  return (
    <div className="space-y-5">
      <h1 className="text-[24px] font-semibold">Faturas</h1>
      {(faturas ?? []).length === 0 ? (
        <p className="rounded-2xl border border-slate-200 bg-white p-5 text-[17px] text-slate-700">Ainda não há faturas emitidas a esta entidade.</p>
      ) : (
        <ul className="divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white">
          {(faturas ?? []).map((f) => (
            <li key={f.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-[17px]">
              <span>
                <b>
                  {f.tipo === 'NC' ? 'Nota de crédito' : 'Fatura'} {f.numero ?? ''}
                </b>
                <span className="block text-[15px] text-slate-600">
                  {MOTIVO[f.reason] ?? f.reason} · {ptDate(f.data)} · {f.cliente_nome}
                </span>
              </span>
              <span className="flex items-center gap-4">
                <span className="tabular-nums">{formatEuros(f.total_cents)}</span>
                {links.get(f.id) ? (
                  <a href={links.get(f.id)} target="_blank" rel="noopener noreferrer" className="btn-secondary btn-sm">
                    Abrir PDF
                  </a>
                ) : (
                  <span className="text-[15px] text-slate-600">Sem PDF</span>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
