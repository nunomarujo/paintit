import { notFound } from 'next/navigation';
import { DOC_KIND_LABELS, ORG_KIND_LABELS } from '@/domain/organization';
import { isPlatformAdmin } from '@/lib/access';
import { getUser } from '@/lib/supabase/server';
import { ReviewForm } from './ReviewForm';

// Equipa da plataforma: documentos à espera de validação, mais antigos primeiro.
export default async function ValidationPage() {
  const { supabase, user } = await getUser();
  if (!(await isPlatformAdmin(supabase, user!.id))) notFound();

  const { data: docs } = await supabase
    .from('org_documents')
    .select('id, kind, nome_ficheiro, valido_ate, created_at, organizations(nome, kind, nif)')
    .in('status', ['submetido', 'em_validacao'])
    .order('created_at');

  return (
    <div>
      <h1 className="text-2xl font-semibold">Validação de documentos</h1>
      <p className="mt-2 text-sm text-slate-600">
        Confirme que o documento corresponde à entidade (nome e NIF) e que está dentro da validade.
      </p>
      {!docs || docs.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
          Não há documentos à espera.
        </p>
      ) : (
        <ul className="mt-6 space-y-4">
          {docs.map((d) => (
            <li key={d.id} className="rounded-2xl border border-slate-200 bg-white p-5 text-sm">
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
              </p>
              <ReviewForm documentId={d.id} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
