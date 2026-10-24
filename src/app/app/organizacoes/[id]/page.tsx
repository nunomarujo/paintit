import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cancelInvitation, removeMember } from '@/app/app/actions';
import {
  BUILDING_KIND_LABELS,
  DOC_KIND_LABELS,
  MEMBER_ROLE_LABELS,
  ORG_KIND_LABELS,
  missingDocs,
} from '@/domain/organization';
import { canManage, myRole } from '@/lib/access';
import { getUser } from '@/lib/supabase/server';
import { DocumentUpload } from './DocumentUpload';
import { InviteForm } from './InviteForm';
import { DeleteOrg } from './DeleteOrg';
import { SupplierReviewAnswer } from './SupplierReviewAnswer';

const STATUS_LABELS: Record<string, string> = {
  submetido: 'Submetido',
  em_validacao: 'Em validação',
  aprovado: 'Aprovado',
  rejeitado: 'Rejeitado',
  expirado: 'Expirado',
};

const REQUEST_STATUS_LABELS: Record<string, string> = {
  rascunho: 'Rascunho',
  publicado: 'Publicado',
  encerrado: 'Encerrado',
  cancelado: 'Cancelado',
};

const card = 'rounded-2xl border border-slate-200 bg-white p-6';
const smallButton = 'rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50';
const ptDate = (iso: string) => iso.slice(0, 10).split('-').reverse().join('/');

export default async function OrganizationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await getUser();

  const { data: org } = await supabase.from('organizations').select('*').eq('id', id).maybeSingle();
  if (!org) notFound();

  const role = await myRole(supabase, user!.id, org);
  const manager = canManage(role);
  const owner = role === 'proprietario';

  const [{ data: buildings }, { data: docs }, { data: managed }, { data: members }, { data: invites }, { data: requests }, { data: supplierReviews }] =
    await Promise.all([
      supabase.from('buildings').select('id, nome_interno, tipo, concelho, pisos').eq('org_id', id).order('nome_interno'),
      supabase
        .from('org_documents')
        .select('id, kind, nome_ficheiro, status, valido_ate, notas_validacao, created_at')
        .eq('org_id', id)
        .order('created_at', { ascending: false }),
      org.kind === 'administradora'
        ? supabase
            .from('organizations')
            .select('id, nome, nif, morada_fiscal, codigo_postal, localidade')
            .eq('gerida_por', id)
            .order('nome')
        : Promise.resolve({ data: null }),
      supabase.from('org_members').select('user_id, role, created_at').eq('org_id', id).order('created_at'),
      owner
        ? supabase
            .from('org_invitations')
            .select('id, email, role, expires_at')
            .eq('org_id', id)
            .is('accepted_at', null)
            .order('created_at')
        : Promise.resolve({ data: null }),
      supabase
        .from('work_requests')
        .select('id, titulo, status, prazo_propostas, building_id')
        .eq('org_id', id)
        .order('created_at', { ascending: false }),
      org.kind === 'fornecedor'
        ? supabase
            .from('supplier_reviews')
            .select('id, painter_org_id, produto, entrega, atendimento, comentario, resposta, created_at')
            .eq('supplier_org_id', id)
            .order('created_at', { ascending: false })
        : Promise.resolve({ data: null }),
    ]);

  const memberIds = (members ?? []).map((m) => m.user_id);
  const { data: profiles } = memberIds.length
    ? await supabase.from('profiles').select('user_id, nome, email').in('user_id', memberIds)
    : { data: [] };
  const profileOf = new Map((profiles ?? []).map((p) => [p.user_id, p]));

  const reviewerIds = [...new Set((supplierReviews ?? []).map((r) => r.painter_org_id))];
  const { data: reviewerOrgs } = reviewerIds.length ? await supabase.from('organizations').select('id, nome').in('id', reviewerIds) : { data: [] };
  const reviewerName = new Map((reviewerOrgs ?? []).map((o) => [o.id, o.nome]));

  const missing = missingDocs(org.kind, docs ?? []);
  const ownsBuildings = org.kind === 'condominio' || org.kind === 'particular';

  // Prédios dos condomínios administrados, para o cartão de cada um mostrar morada, frações e nº de
  // prédios sem se ter de entrar lá dentro (promotor, 24/10/2026). A gestora tem acesso de leitura a
  // estes prédios pela própria política RLS (`can_access_org` inclui quem gere a entidade).
  const managedIds = (managed ?? []).map((c) => c.id);
  const { data: managedBuildings } = managedIds.length
    ? await supabase.from('buildings').select('id, org_id, nome_interno, concelho, fracoes').in('org_id', managedIds).order('nome_interno')
    : { data: [] };
  const buildingsOf = (orgId: string) => (managedBuildings ?? []).filter((b) => b.org_id === orgId);

  return (
    <div className="space-y-8">
      <div>
        <Link href="/app" className="text-sm text-slate-600 hover:underline">
          ← As suas entidades
        </Link>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">{org.nome}</h1>
            <p className="mt-1 text-sm text-slate-600">
              {ORG_KIND_LABELS[org.kind]}
              {org.nif ? ` · NIF ${org.nif}` : ''}
              {role ? ` · o seu papel: ${MEMBER_ROLE_LABELS[role].label.toLowerCase()}` : ''}
            </p>
          </div>
          {manager && (
            <div className="flex flex-col items-end gap-2">
              <Link href={`/app/organizacoes/${org.id}/editar`} className={smallButton}>
                Editar dados
              </Link>
              {role === 'proprietario' && <DeleteOrg orgId={org.id} nome={org.nome} />}
            </div>
          )}
        </div>
      </div>

      {org.kind === 'fornecedor' && (
        <div className={`${card} flex flex-wrap gap-4 font-semibold text-tinta-700`}>
          <Link href={`/app/organizacoes/${org.id}/produtos`} className="hover:underline">
            Subscrição (Stripe), catálogo, descontos e entregas →
          </Link>
          <Link href="/app/encomendas" className="hover:underline">
            Encomendas com confirmação →
          </Link>
          <Link href={`/app/organizacoes/${org.id}/adesoes`} className="hover:underline">
            Descontos a novos aderentes →
          </Link>
        </div>
      )}
      {org.kind === 'administradora' && (
        <div className={`${card} flex flex-wrap gap-4 font-semibold text-tinta-700`}>
          <Link href={`/app/organizacoes/${org.id}/pedidos/novo`} className="hover:underline">
            Novo pedido de orçamento →
          </Link>
          <Link href="#predios" className="font-normal text-slate-600 hover:underline">
            Prédios sob administração
          </Link>
        </div>
      )}
      {org.kind === 'pintor' && (
        <div className={`${card} flex flex-wrap gap-4 font-semibold text-tinta-700`}>
          <Link href="/app/oportunidades" className="hover:underline">
            Ver oportunidades de obra →
          </Link>
          <Link href="/app/obras" className="font-normal text-slate-600 hover:underline">
            Ferramentas de obra
          </Link>
          <Link href={`/app/organizacoes/${org.id}/referencias`} className="hover:underline">
            Referências de fornecedores →
          </Link>
        </div>
      )}

      <section className={card}>
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

      {org.kind === 'fornecedor' && (
        <section className={card}>
          <h2 className="font-semibold">Avaliações de pintores</h2>
          <p className="mt-1 text-sm text-slate-600">De quem já encomendou e recebeu o produto.</p>
          {(supplierReviews ?? []).length === 0 ? (
            <p className="mt-4 text-sm text-slate-600">Ainda sem avaliações.</p>
          ) : (
            <ul className="mt-4 divide-y divide-slate-100 text-sm">
              {(supplierReviews ?? []).map((r, i) => (
                <li key={i} className="py-3">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="font-medium">{reviewerName.get(r.painter_org_id) ?? 'Um pintor'}</span>
                    <span className="text-xs text-slate-500">{ptDate(r.created_at)}</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">Produto {r.produto}/5 · Entrega {r.entrega}/5 · Atendimento {r.atendimento}/5</p>
                  {r.comentario && <p className="mt-1 text-slate-700">{r.comentario}</p>}
                  {r.resposta && (
                    <p className="mt-2 rounded-lg bg-slate-50 p-2 text-slate-700">
                      <span className="text-slate-500">Resposta: </span>
                      {r.resposta}
                    </p>
                  )}
                  {manager && <SupplierReviewAnswer reviewId={r.id} supplierOrgId={id} initial={r.resposta} />}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {/* Prédios sob administração, em cartões (promotor, 24/10/2026): a lista de texto de antes não
          mostrava o NIPC do condomínio, a morada nem as frações, e obrigava a entrar em cada um para
          ver o que quer que fosse. Cada condomínio continua a ser entidade própria, com o seu NIPC — é
          ele que assina e é faturado, nunca a gestora. */}
      {org.kind === 'administradora' && (
        <section className={card} id="predios">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold">Prédios sob administração</h2>
              <p className="mt-1 text-sm text-slate-600">
                Um cartão por condomínio administrado. Cada um tem o seu NIPC, os seus prédios e os seus pedidos, sem
                se misturar com os outros nem com os dados da gestora.
              </p>
            </div>
            {manager && (
              <Link href={`/app/organizacoes/nova?tipo=condominio&gerida_por=${org.id}`} className={smallButton}>
                Acrescentar condomínio
              </Link>
            )}
          </div>
          {managed && managed.length > 0 ? (
            <ul className="mt-5 grid gap-4 sm:grid-cols-2">
              {managed.map((c) => {
                const bs = buildingsOf(c.id);
                const fracoes = bs.reduce((n, b) => n + (b.fracoes ?? 0), 0);
                return (
                  <li key={c.id} className="rounded-xl border border-slate-200 p-4 text-sm">
                    <Link href={`/app/organizacoes/${c.id}`} className="font-semibold hover:underline">
                      {c.nome}
                    </Link>
                    <dl className="mt-2 space-y-1 text-slate-600">
                      <div>
                        <dt className="inline text-slate-500">NIPC do condomínio: </dt>
                        <dd className="inline">{c.nif ?? <span className="text-amber-800">por preencher</span>}</dd>
                      </div>
                      <div>
                        <dt className="inline text-slate-500">Morada: </dt>
                        <dd className="inline">
                          {[c.morada_fiscal, c.codigo_postal, c.localidade].filter(Boolean).join(', ') || (
                            <span className="text-amber-800">por preencher</span>
                          )}
                        </dd>
                      </div>
                      <div>
                        <dt className="inline text-slate-500">Prédios: </dt>
                        <dd className="inline">
                          {bs.length === 0 ? (
                            <span className="text-amber-800">nenhum registado</span>
                          ) : (
                            <>
                              {bs.length}
                              {fracoes > 0 ? ` · ${fracoes} ${fracoes === 1 ? 'fração' : 'frações'}` : ''}
                              {bs[0]?.concelho ? ` · ${bs[0].concelho}` : ''}
                            </>
                          )}
                        </dd>
                      </div>
                    </dl>
                    {manager && (
                      <div className="mt-3 flex flex-wrap gap-3 font-medium text-tinta-700">
                        <Link href={`/app/organizacoes/${c.id}/editar`} className="hover:underline">
                          Editar dados
                        </Link>
                        <Link href={`/app/organizacoes/${c.id}/predios/novo`} className="hover:underline">
                          {bs.length === 0 ? 'Registar prédio' : 'Acrescentar prédio'}
                        </Link>
                        {bs.length > 0 && (
                          <Link href={`/app/organizacoes/${c.id}/pedidos/novo`} className="hover:underline">
                            Novo pedido
                          </Link>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-slate-600">
              Ainda sem nenhum condomínio. Acrescente o primeiro: pede-se a designação, o NIPC do próprio condomínio e,
              a seguir, a morada completa e o número de frações do prédio.
            </p>
          )}
        </section>
      )}

      {ownsBuildings && (
        <section className={card}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-semibold">{org.kind === 'particular' ? 'Imóveis' : 'Prédios'}</h2>
            {manager && (
              <Link href={`/app/organizacoes/${org.id}/predios/novo`} className={smallButton}>
                Adicionar {org.kind === 'particular' ? 'imóvel' : 'prédio'}
              </Link>
            )}
          </div>
          {buildings && buildings.length > 0 ? (
            <ul className="mt-4 divide-y divide-slate-100 text-sm">
              {buildings.map((b) => (
                <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <span>
                    <span className="font-medium">{b.nome_interno}</span>
                    <span className="block text-slate-500">
                      {BUILDING_KIND_LABELS[b.tipo]} · {b.concelho}
                      {b.pisos !== null ? ` · ${b.pisos} pisos` : ''}
                    </span>
                  </span>
                  {manager && (
                    <Link href={`/app/organizacoes/${org.id}/predios/${b.id}/editar`} className="text-tinta-700 hover:underline">
                      Editar
                    </Link>
                  )}
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

      {ownsBuildings && (
        <section className={card}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-semibold">Pedidos de orçamento</h2>
            {manager && buildings && buildings.length > 0 && (
              <Link href={`/app/organizacoes/${org.id}/pedidos/novo`} className={smallButton}>
                Novo pedido
              </Link>
            )}
          </div>
          {requests && requests.length > 0 ? (
            <ul className="mt-4 divide-y divide-slate-100 text-sm">
              {requests.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <Link href={`/app/pedidos/${r.id}`} className="font-medium hover:underline">
                    {r.titulo}
                  </Link>
                  <span className="text-slate-600">
                    {REQUEST_STATUS_LABELS[r.status]}
                    {r.status === 'publicado' && r.prazo_propostas ? ` · propostas até ${ptDate(r.prazo_propostas)}` : ''}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-slate-600">
              {buildings && buildings.length > 0
                ? 'Descreva a obra uma vez e receba propostas comparáveis.'
                : 'Registe primeiro um prédio para pedir orçamentos.'}
            </p>
          )}
        </section>
      )}

      <section className={card}>
        <h2 className="font-semibold">Equipa</h2>
        <ul className="mt-4 divide-y divide-slate-100 text-sm">
          {(members ?? []).map((m) => {
            const p = profileOf.get(m.user_id);
            const isMe = m.user_id === user!.id;
            return (
              <li key={m.user_id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span>
                  <span className="font-medium">{p?.nome || p?.email || 'Membro'}</span>
                  {isMe && <span className="text-slate-500"> (você)</span>}
                  {p?.nome && p.email && <span className="block text-slate-500">{p.email}</span>}
                </span>
                <span className="flex items-center gap-3">
                  <span className="text-slate-600">{MEMBER_ROLE_LABELS[m.role].label}</span>
                  {owner && !isMe && (
                    <form action={removeMember.bind(null, org.id, m.user_id)}>
                      <button type="submit" className="text-red-700 hover:underline">
                        Remover
                      </button>
                    </form>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
        {org.gerida_por && (
          <p className="mt-3 text-xs text-slate-500">A equipa da administradora que gere este condomínio também tem acesso.</p>
        )}

        {owner && invites && invites.length > 0 && (
          <div className="mt-4">
            <h3 className="text-sm font-semibold">Convites pendentes</h3>
            <ul className="mt-2 divide-y divide-slate-100 text-sm">
              {invites.map((i) => (
                <li key={i.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <span>
                    {i.email} · {MEMBER_ROLE_LABELS[i.role].label}
                    <span className="block text-slate-500">válido até {ptDate(i.expires_at)}</span>
                  </span>
                  <form action={cancelInvitation.bind(null, org.id, i.id)}>
                    <button type="submit" className="text-red-700 hover:underline">
                      Cancelar
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          </div>
        )}

        {owner && (
          <div className="mt-6 border-t border-slate-100 pt-6">
            <InviteForm orgId={org.id} orgKind={org.kind} />
          </div>
        )}
      </section>

      {/* id/scroll-mt: destino do atalho "Preencher documento em falta" nas oportunidades
          (ProposalForms.tsx/[id]/page.tsx) — pedido do promotor, 23/10/2026, para quem vem de lá
          cair exatamente aqui, sem ter de procurar a secção. */}
      <section id="documentos" className={`${card} scroll-mt-6`}>
        <h2 className="font-semibold">Documentos de verificação</h2>
        {missing.length > 0 ? (
          <div className="mt-3 rounded-xl border-2 border-red-400 bg-red-50 p-4 text-sm">
            <p className="font-semibold text-red-900">
              {missing.length === 1 ? 'Falta um documento' : `Faltam ${missing.length} documentos`} para a verificação:
            </p>
            <ul className="mt-2 list-disc pl-5 text-red-900">
              {missing.map((group) => (
                <li key={group.join('|')}>{group.map((k) => DOC_KIND_LABELS[k]).join(' ou ')}</li>
              ))}
            </ul>
            <p className="mt-2 text-red-800">
              A maioria dos orçamentos sem este documento é eliminada pelos clientes antes de serem lidos. Submeta-o já aqui abaixo.
            </p>
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
                  <a href={`/app/documentos/${d.id}`} target="_blank" rel="noreferrer" className="text-tinta-700 hover:underline">
                    {' '}
                    · {d.nome_ficheiro}
                  </a>
                  {d.status === 'rejeitado' && d.notas_validacao && (
                    <span className="block text-red-700">Motivo: {d.notas_validacao}</span>
                  )}
                </span>
                <span className="text-slate-600">
                  {STATUS_LABELS[d.status]}
                  {d.valido_ate ? ` · válido até ${ptDate(d.valido_ate)}` : ''}
                </span>
              </li>
            ))}
          </ul>
        )}

        {role && role !== 'leitor' && (
          <div className="mt-6 border-t border-slate-100 pt-6">
            <DocumentUpload orgId={org.id} orgKind={org.kind} />
          </div>
        )}
      </section>
    </div>
  );
}
