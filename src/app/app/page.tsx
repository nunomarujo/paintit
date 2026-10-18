import Link from 'next/link';
import { ORG_KIND_LABELS } from '@/domain/organization';
import { getUser } from '@/lib/supabase/server';

export default async function Dashboard() {
  const { supabase } = await getUser();
  const { data: orgs } = await supabase
    .from('organizations')
    .select('id, kind, nome, nif, localidade, gerida_por')
    .order('nome');

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">As suas entidades</h1>
        <Link
          href="/app/organizacoes/nova"
          className="rounded-lg bg-tinta-600 px-4 py-2 text-sm font-semibold text-white hover:bg-tinta-700"
        >
          Adicionar entidade
        </Link>
      </div>

      {!orgs || orgs.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="font-semibold">Comece por registar a sua entidade</h2>
          <p className="mt-2 text-sm text-slate-600">
            Um condomínio, uma empresa de administração, um particular, um pintor ou um fornecedor. Os dados fiscais
            servem para o contrato e nunca são mostrados à outra parte antes da apresentação.
          </p>
        </div>
      ) : (
        <ul className="mt-6 divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white">
          {orgs.map((o) => (
            <li key={o.id}>
              <Link href={`/app/organizacoes/${o.id}`} className="flex flex-wrap justify-between gap-2 p-4 hover:bg-slate-50">
                <span>
                  <span className="font-semibold">{o.nome}</span>
                  <span className="block text-sm text-slate-600">
                    {ORG_KIND_LABELS[o.kind]}
                    {o.gerida_por ? ' · gerido pela sua administradora' : ''}
                  </span>
                </span>
                <span className="text-sm text-slate-500">{o.localidade ?? ''}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
