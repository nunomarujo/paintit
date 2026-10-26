import { DOC_KIND_LABELS, ORG_KIND_LABELS } from '@/domain/organization';
import { getUser } from '@/lib/supabase/server';
import { ReviewForm } from './ReviewForm';

// Documentos à espera de validação, mais antigos primeiro.
export default async function DocumentsPage() {
  const { supabase } = await getUser();
  const { data: docs } = await supabase
    .from('org_documents')
    .select('id, kind, nome_ficheiro, valido_ate, classe, created_at, organizations(nome, kind, nif)')
    .in('status', ['submetido', 'em_validacao'])
    .order('created_at');
  return (
    <section>
      <p className="text-[17px] text-slate-600">Confirme que o documento corresponde à entidade (nome e NIF) e que está dentro da validade.</p>
      {!docs || docs.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 text-[17px] text-slate-600">Não há documentos à espera.</p>
      ) : (
        <ul className="mt-6 space-y-4">
          {docs.map((d) => (
            <li key={d.id} className="rounded-2xl border border-slate-200 bg-white p-5 text-[17px]">
              <div className="flex flex-wrap justify-between gap-2">
                <span>
                  <span className="font-semibold">{d.organizations?.nome}</span>
                  <span className="text-slate-500">
                    {' '}
                    · {d.organizations ? ORG_KIND_LABELS[d.organizations.kind] : ''}
                    {d.organizations?.nif ? ` · NIF ${d.organizations.nif}` : ''}
                  </span>
                </span>
                <span className="text-slate-500">enviado a {d.created_at.slice(0, 10).split('-').reverse().join('/')}</span>
              </div>
              <p className="mt-1">
                {DOC_KIND_LABELS[d.kind]} ·{' '}
                <a href={`/app/documentos/${d.id}`} target="_blank" rel="noreferrer" className="text-tinta-700 hover:underline">
                  {d.nome_ficheiro}
                </a>
                {d.valido_ate ? ` · válido até ${d.valido_ate.split('-').reverse().join('/')}` : ''}
                {d.classe ? ` · classe ${d.classe} (confirme no portal do IMPIC)` : ''}
              </p>
              <ReviewForm documentId={d.id} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
