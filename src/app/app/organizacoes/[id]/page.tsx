import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  BUILDING_KIND_LABELS,
  DOC_KIND_LABELS,
  ORG_KIND_LABELS,
  missingDocs,
} from '@/domain/organization';
import { getUser } from '@/lib/supabase/server';
import { DocumentUpload } from './DocumentUpload';

const STATUS_LABELS: Record<string, string> = {
  submetido: 'Submetido',
  em_validacao: 'Em validação',
  aprovado: 'Aprovado',
  rejeitado: 'Rejeitado',
  expirado: 'Expirado',
};

export default async function OrganizationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await getUser();

  const { data: org } = await supabase.from('organizations').select('*').eq('id', id).maybeSingle();
  if (!org) notFound();

  const [{ data: buildings }, { data: docs }, { data: managed }] = await Promise.all([
    supabase.from('buildings').select('id, nome_interno, tipo, localidade, concelho, pisos').eq('org_id', id).order('nome_interno'),
    supabase.from('org_documents').select('id, kind, nome_ficheiro, status, valido_ate, created_at').eq('org_id', id).order('created_at', { ascending: false }),
    org.kind === 'administradora'
      ? supabase.from('organizations').select('id, nome, localidade').eq('gerida_por', id).order('nome')
      : Promise.resolve({ data: null }),
  ]);

  const missing = missingDocs(org.kind, docs ?? []);
  const ownsBuildings = org.kind === 'condominio' || org.kind === 'particular';

  return (
    <div className="space-y-8">
      <div>
        <Link href="/app" className="text-sm text-slate-600 hover:underline">
          ← As suas entidades
        </Link>
        <h1 className="mt-3 text-2xl font-semibold">{org.nome}</h1>
        <p className="mt-1 text-sm text-slate-600">
          {ORG_KIND_LABELS[org.kind]}
          {org.nif ? ` · NIF ${org.nif}` : ''}
        </p>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="font-semibold">Dados da entidade</h2>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-slate-500">Morada fiscal</dt>
            <dd>{[org.morada_fiscal, org.codigo_postal, org.localidade].filter(Boolean).join(', ') || '—'}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Contacto</dt>
            <dd>{[org.email_contacto, org.telefone].filter(Boolean).join(' · ') || '—'}</dd>
          </div>
          {org.atendimento_publico && (
            <div className="sm:col-span-2">
              <dt className="text-slate-500">Atendimento ao público</dt>
              <dd>{org.atendimento_publico}</dd>
            </div>
          )}
        </dl>
      </section>

      {org.kind === 'administradora' && (
        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-semibold">Condomínios geridos</h2>
            <Link
              href={`/app/organizacoes/nova?tipo=condominio&gerida_por=${org.id}`}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
            >
              Adicionar condomínio
            </Link>
          </div>
          {managed && managed.length > 0 ? (
            <ul className="mt-4 divide-y divide-slate-100 text-sm">
              {managed.map((c) => (
                <li key={c.id} className="py-2">
                  <Link href={`/app/organizacoes/${c.id}`} className="font-medium hover:underline">
                    {c.nome}
                  </Link>
                  {c.localidade && <span className="text-slate-500"> · {c.localidade}</span>}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-slate-600">
              Cada condomínio tem o seu NIF, os seus prédios e os seus pedidos, sem se misturar com os outros.
            </p>
          )}
        </section>
      )}

      {ownsBuildings && (
        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-semibold">{org.kind === 'particular' ? 'Imóveis' : 'Prédios'}</h2>
            <Link
              href={`/app/organizacoes/${org.id}/predios/novo`}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
            >
              Adicionar {org.kind === 'particular' ? 'imóvel' : 'prédio'}
            </Link>
          </div>
          {buildings && buildings.length > 0 ? (
            <ul className="mt-4 divide-y divide-slate-100 text-sm">
              {buildings.map((b) => (
                <li key={b.id} className="flex flex-wrap justify-between gap-2 py-2">
                  <span className="font-medium">{b.nome_interno}</span>
                  <span className="text-slate-500">
                    {BUILDING_KIND_LABELS[b.tipo]} · {b.concelho}
                    {b.pisos !== null ? ` · ${b.pisos} pisos` : ''}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-slate-600">
              Registe o prédio uma vez e use-o em todos os pedidos de orçamento. A morada fica privada: aos pintores só
              é mostrado o concelho.
            </p>
          )}
        </section>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="font-semibold">Documentos de verificação</h2>
        {missing.length > 0 ? (
          <div className="mt-3 rounded-xl bg-amber-50 p-4 text-sm">
            <p className="font-medium">Faltam {missing.length === 1 ? 'um documento' : `${missing.length} documentos`} para a verificação:</p>
            <ul className="mt-2 list-disc pl-5">
              {missing.map((group) => (
                <li key={group.join('|')}>{group.map((k) => DOC_KIND_LABELS[k]).join(' ou ')}</li>
              ))}
            </ul>
          </div>
        ) : (
          org.kind !== 'particular' && (
            <p className="mt-3 text-sm text-slate-600">Todos os documentos pedidos foram submetidos.</p>
          )
        )}

        {docs && docs.length > 0 && (
          <ul className="mt-4 divide-y divide-slate-100 text-sm">
            {docs.map((d) => (
              <li key={d.id} className="flex flex-wrap justify-between gap-2 py-2">
                <span>
                  <span className="font-medium">{DOC_KIND_LABELS[d.kind]}</span>
                  <span className="text-slate-500"> · {d.nome_ficheiro}</span>
                </span>
                <span className="text-slate-600">
                  {STATUS_LABELS[d.status]}
                  {d.valido_ate ? ` · válido até ${d.valido_ate.split('-').reverse().join('/')}` : ''}
                </span>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-6 border-t border-slate-100 pt-6">
          <DocumentUpload orgId={org.id} />
        </div>
      </section>
    </div>
  );
}
