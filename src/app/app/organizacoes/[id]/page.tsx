import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cancelInvitation, removeMember } from '@/app/app/actions';
import {
  BUILDING_KIND_LABELS,
  CAPABILITY_LABELS,
  DOC_KIND_LABELS,
  MEMBER_ROLE_LABELS,
  ORG_KIND_LABELS,
  ROLE_CAPABILITIES,
  caeAviso,
  caeElegibilidade,
  missingDocs,
  type MemberRole,
} from '@/domain/organization';
import { canManage, myRole } from '@/lib/access';
import { getUser } from '@/lib/supabase/server';
import { LocalTabs } from '@/components/LocalTabs';
import { PasswordForm } from '@/app/app/perfil/PasswordForm';
import { ChangeEmailForm } from './ChangeEmailForm';
import { DocumentUpload } from './DocumentUpload';
import { LogotipoDaEmpresa } from './LogotipoDaEmpresa';
import { EntityCardForm } from './EntityCardForm';
import { InviteForm } from './InviteForm';
import { DeleteOrg } from './DeleteOrg';
import { MemberRoleSelect } from './MemberRoleSelect';
import { SupplierReviewAnswer } from './SupplierReviewAnswer';
import { Voltar } from '@/components/Voltar';

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

const card = 'rounded-2xl border border-slate-200 bg-white p-4 sm:p-5';
const smallButton = 'rounded-lg border border-slate-300 px-3 py-1.5 text-[17px] hover:bg-slate-50';
const ptDate = (iso: string) => iso.slice(0, 10).split('-').reverse().join('/');

function Sumario({ rotulo, valor }: { rotulo: string; valor: number | null }) {
  return (
    <div>
      <dt className="text-slate-500">{rotulo}</dt>
      <dd className={valor === null ? 'text-amber-800' : 'font-medium'}>{valor ?? 'por preencher'}</dd>
    </div>
  );
}

function GearIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M12 2.8v2.4M12 18.8v2.4M21.2 12h-2.4M5.2 12H2.8M18.5 5.5l-1.7 1.7M7.2 16.8l-1.7 1.7M18.5 18.5l-1.7-1.7M7.2 7.2 5.5 5.5" />
    </svg>
  );
}

export default async function OrganizationPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ predio?: string; ver?: string }>;
}) {
  const { id } = await params;
  const { predio: predioSelecionado, ver } = await searchParams;
  const { supabase, user } = await getUser();

  const { data: org } = await supabase.from('organizations').select('*').eq('id', id).maybeSingle();
  if (!org) notFound();

  const role = await myRole(supabase, user!.id, org);
  // O cofre dos logótipos é público (ver a migração `logotipo_da_empresa`): o endereço é estável e
  // serve num PDF guardado hoje e aberto daqui a um ano, ao contrário de um link assinado.
  const logotipoUrl = org.logotipo_path
    ? supabase.storage.from('logotipos').getPublicUrl(org.logotipo_path).data.publicUrl
    : null;
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

  // "O meu Perfil" (26/10/2026, docs/DECISOES.md): só pintor e fornecedor têm esta reorganização em
  // separadores — a conta é uma só empresa, e é dela que esta página passa a falar o tempo todo.
  // Condomínio, administradora e particular mantêm o ecrã de sempre, sem nenhuma destas secções.
  const isEmpresa = org.kind === 'pintor' || org.kind === 'fornecedor';
  const separador = ver === 'documentos' || ver === 'equipa' ? ver : 'dados';
  const minhaFicha = profileOf.get(user!.id);
  const elegibilidade = caeElegibilidade(org.cae ?? null);
  const avisoCae = caeAviso(elegibilidade);

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
    ? await supabase
        .from('buildings')
        .select('id, org_id, nome_interno, tipo, morada, codigo_postal, localidade, concelho, pisos, fracoes, fachadas, ano_construcao, tem_elevador, tem_varandas')
        .in('org_id', managedIds)
        .order('nome_interno')
    : { data: [] };
  const buildingsOf = (orgId: string) => (managedBuildings ?? []).filter((b) => b.org_id === orgId);

  // Prédio em foco (pedido do promotor, 24/10/2026): clica-se num cartão, fica marcado, e é dele que o
  // cartão de cima passa a falar. Fica no endereço (`?predio=`) e não em estado do navegador, para
  // aguentar um recarregar e poder ser partilhado com um colega da equipa. Sem escolha, mostra o
  // primeiro — a gestora tem quase sempre mais do que um, e um ecrã que começa vazio não ajuda ninguém.
  const predios = managedBuildings ?? [];
  const predioEmFoco = predios.find((b) => b.id === predioSelecionado) ?? predios[0] ?? null;
  const condominioEmFoco = predioEmFoco ? (managed ?? []).find((c) => c.id === predioEmFoco.org_id) ?? null : null;

  return (
    <div className="space-y-8">
      <div>
        <Voltar href="/app">As suas entidades</Voltar>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-[26px] leading-tight font-semibold">{org.nome}</h1>
            <p className="mt-1 text-[17px] text-slate-600">
              {ORG_KIND_LABELS[org.kind]}
              {org.nif ? ` · NIF ${org.nif}` : ''}
              {role ? ` · o seu papel: ${MEMBER_ROLE_LABELS[role].label.toLowerCase()}` : ''}
            </p>
          </div>
          {manager && (
            <div className="flex flex-col items-end gap-2">
              {/* Os dados da própria entidade editam-se aqui, junto ao nome — não no cartão de baixo,
                  que na gestora passou a ser do prédio selecionado (promotor, 24/10/2026). */}
              <Link
                href={`/app/organizacoes/${org.id}/editar`}
                aria-label={`Configurar os dados de ${org.nome}`}
                title="Configurar os dados desta entidade"
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-1.5 text-[17px] hover:bg-slate-50"
              >
                <GearIcon />
                <span className={org.kind === 'administradora' ? 'sr-only sm:not-sr-only' : ''}>Configurar</span>
              </Link>
              {role === 'proprietario' && <DeleteOrg orgId={org.id} nome={org.nome} />}
            </div>
          )}
        </div>
      </div>

      {/* As ligações rápidas de fornecedor e de pintor que estavam aqui (Subscrição, Encomendas,
          Descontos; Oportunidades, Gestão de obra, Referências) saíram: já vivem na barra lateral
          (grupos "Vender"/"Ganhar obra" e o rodapé "O meu Perfil"), repetir aqui era redundante
          (26/10/2026, docs/DECISOES.md). */}
      {org.kind === 'administradora' && (
        <div className={`${card} flex flex-wrap gap-4 font-semibold text-tinta-700`}>
          <Link href={`/app/organizacoes/${org.id}/pedidos/novo`} className="hover:underline">
            Novo pedido de orçamento
          </Link>
          <Link href="#predios" className="font-normal text-slate-600 hover:underline">
            Prédios sob administração
          </Link>
        </div>
      )}
      {/* Numa gestora, o cartão de cima fala do **prédio selecionado**, não da gestora: é com prédios que
          ela trabalha o dia todo, e os dados dela prória editam-se no ícone junto ao nome (promotor,
          24/10/2026). Nas outras entidades, continua a mostrar os dados da própria entidade. */}
      {org.kind === 'administradora' ? (
        <section className={card}>
          {predioEmFoco && condominioEmFoco ? (
            <>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[15px] uppercase tracking-wide text-slate-500">Prédio selecionado</p>
                  <h2 className="mt-1 font-semibold">{predioEmFoco.nome_interno}</h2>
                  <p className="mt-1 text-[17px] text-slate-600">
                    {[predioEmFoco.morada, predioEmFoco.codigo_postal, predioEmFoco.localidade].filter(Boolean).join(', ')}
                  </p>
                  <p className="mt-1 text-[17px] text-slate-600">
                    {condominioEmFoco.nome}
                    {condominioEmFoco.nif ? ` · NIPC ${condominioEmFoco.nif}` : ''}
                  </p>
                </div>
                {manager && (
                  <Link
                    href={`/app/organizacoes/${condominioEmFoco.id}/predios/${predioEmFoco.id}/editar`}
                    className="inline-flex items-center gap-2 rounded-lg border border-tinta-600 px-3 py-1.5 text-[17px] font-semibold text-tinta-700 hover:bg-tinta-50"
                  >
                    <GearIcon />
                    Configurar prédio
                  </Link>
                )}
              </div>
              <dl className="mt-4 grid gap-3 text-[17px] sm:grid-cols-4">
                <Sumario rotulo="Pisos" valor={predioEmFoco.pisos} />
                <Sumario rotulo="Frações" valor={predioEmFoco.fracoes} />
                <Sumario rotulo="Fachadas" valor={predioEmFoco.fachadas} />
                <Sumario rotulo="Ano" valor={predioEmFoco.ano_construcao} />
              </dl>
              <p className="mt-3 text-[15px] text-slate-600">
                {BUILDING_KIND_LABELS[predioEmFoco.tipo]} · {predioEmFoco.concelho}
                {predioEmFoco.tem_elevador ? ' · com elevador' : ''}
                {predioEmFoco.tem_varandas ? ' · com varandas' : ''}
              </p>
            </>
          ) : (
            <>
              <h2 className="font-semibold">Nenhum prédio selecionado</h2>
              <p className="mt-1 text-[17px] text-slate-600">
                Acrescente o primeiro condomínio e o seu prédio em “Prédios sob administração”, aqui abaixo. Os dados da
                gestora editam-se no ícone junto ao nome, lá em cima.
              </p>
            </>
          )}
        </section>
      ) : isEmpresa ? null : (
      <section className={card}>
        <h2 className="font-semibold">Dados da entidade</h2>
        <dl className="mt-4 grid gap-3 text-[17px] sm:grid-cols-2">
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
      )}

      {/* "O meu Perfil" (26/10/2026, docs/DECISOES.md): só pintor e fornecedor. Três separadores
          substituem o que estava disperso pela página — dados da entidade, documentos e equipa — e o
          estado vive no endereço (`?ver=`), como o resto da aplicação (LocalTabs). */}
      {isEmpresa && (
        <section className="space-y-5">
          <LocalTabs
            tabs={[
              { href: `/app/organizacoes/${org.id}?ver=dados`, label: 'Dados da entidade', active: separador === 'dados' },
              { href: `/app/organizacoes/${org.id}?ver=documentos`, label: 'Documentos', active: separador === 'documentos' },
              { href: `/app/organizacoes/${org.id}?ver=equipa`, label: 'Equipa online', active: separador === 'equipa' },
            ]}
          />

          {separador === 'dados' && (
            <div className="space-y-5">
              <section className={card}>
                <EntityCardForm
                  orgId={org.id}
                  nome={org.nome}
                  gerenteNome={minhaFicha?.nome ?? ''}
                  telefone={org.telefone}
                  emailContacto={org.email_contacto ?? ''}
                />
                <p className="mt-4 text-[15px] text-slate-500">
                  NIF e morada fiscal ficam na{' '}
                  <Link href={`/app/organizacoes/${org.id}/editar`} className="font-semibold text-tinta-700 hover:underline">
                    configuração completa
                  </Link>
                  .
                </p>
                {avisoCae && (
                  <p className="mt-4 border-t border-slate-100 pt-4 text-[17px] text-amber-800">{avisoCae}</p>
                )}
              </section>
              <section className={card}>
                <PasswordForm />
              </section>
              <section className={card}>
                <ChangeEmailForm emailAtual={user!.email!} />
              </section>
            </div>
          )}

          {separador === 'documentos' && (
            <section id="documentos" className={`${card} scroll-mt-6`}>
              <h2 className="font-semibold">Documentos</h2>
              <p className="mt-1 text-[17px] text-slate-600">Documentos para candidaturas a obras.</p>
              {missing.length > 0 ? (
                <div className="mt-3 rounded-xl border-2 border-amber-400 bg-amber-50 p-4 text-[17px]">
                  <p className="font-semibold text-amber-900">
                    {missing.length === 1 ? 'Falta um documento' : `Faltam ${missing.length} documentos`} para a verificação:
                  </p>
                  <ul className="mt-2 list-disc pl-5 text-amber-900">
                    {missing.map((group) => (
                      <li key={group.join('|')}>{group.map((k) => DOC_KIND_LABELS[k]).join(' ou ')}</li>
                    ))}
                  </ul>
                  <p className="mt-2 text-amber-800">
                    A maioria dos orçamentos sem este documento é eliminada pelos clientes antes de serem lidos. Submeta-o já aqui abaixo.
                  </p>
                </div>
              ) : (
                org.kind !== 'particular' && (
                  <p className="mt-3 text-[17px] text-slate-600">Todos os documentos pedidos foram submetidos.</p>
                )
              )}

              {docs && docs.length > 0 && (
                <ul className="mt-4 divide-y divide-slate-100 text-[17px]">
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
              {role && role !== 'leitor' && (org.kind === 'pintor' || org.kind === 'fornecedor') && (
                <div className="mt-6 border-t border-slate-100 pt-6">
                  <LogotipoDaEmpresa orgId={org.id} url={logotipoUrl} />
                </div>
              )}
            </section>
          )}

          {separador === 'equipa' && (
            <section className={card}>
              <h2 className="font-semibold">Equipa online</h2>
              <p className="mt-1 text-[17px] text-slate-600">
                Quem tem acesso à conta da empresa na plataforma — não a equipa que vai à obra.
              </p>
              <ul className="mt-4 divide-y divide-slate-100 text-[17px]">
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
                        {owner && !isMe ? (
                          <MemberRoleSelect orgId={org.id} userId={m.user_id} orgKind={org.kind} role={m.role} />
                        ) : (
                          <span className="text-slate-600">{MEMBER_ROLE_LABELS[m.role].label}</span>
                        )}
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

              {owner && invites && invites.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-[17px] font-semibold">Convites pendentes</h3>
                  <ul className="mt-2 divide-y divide-slate-100 text-[17px]">
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

              {/* Quadro de capacidades (26/10/2026): o que cada papel pode de facto fazer — lido
                  diretamente das políticas de RLS (ROLE_CAPABILITIES, src/domain/organization.ts), não
                  uma lista inventada à parte. */}
              <div className="mt-6 border-t border-slate-100 pt-6">
                <h3 className="text-[17px] font-semibold">O que cada papel pode fazer</h3>
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full min-w-[480px] text-left text-[15px]">
                    <thead>
                      <tr className="text-slate-500">
                        <th className="py-1.5 pr-3 font-normal">Papel</th>
                        {Object.values(CAPABILITY_LABELS).map((label) => (
                          <th key={label} className="py-1.5 pr-3 font-normal">
                            {label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(Object.keys(ROLE_CAPABILITIES) as MemberRole[])
                        .filter((r) => r !== 'proprietario')
                        .map((r) => (
                          <tr key={r}>
                            <td className="py-1.5 pr-3 font-medium">{MEMBER_ROLE_LABELS[r].label}</td>
                            {(Object.keys(CAPABILITY_LABELS) as (keyof typeof CAPABILITY_LABELS)[]).map((cap) => (
                              <td key={cap} className="py-1.5 pr-3">
                                {ROLE_CAPABILITIES[r][cap] ? '✓' : '—'}
                              </td>
                            ))}
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          )}
        </section>
      )}

      {org.kind === 'fornecedor' && (
        <section className={card}>
          <h2 className="font-semibold">Avaliações de pintores</h2>
          <p className="mt-1 text-[17px] text-slate-600">De quem já encomendou e recebeu o produto.</p>
          {(supplierReviews ?? []).length === 0 ? (
            <p className="mt-4 text-[17px] text-slate-600">Ainda sem avaliações.</p>
          ) : (
            <ul className="mt-4 divide-y divide-slate-100 text-[17px]">
              {(supplierReviews ?? []).map((r, i) => (
                <li key={i} className="py-3">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="font-medium">{reviewerName.get(r.painter_org_id) ?? 'Um pintor'}</span>
                    <span className="text-[15px] text-slate-500">{ptDate(r.created_at)}</span>
                  </div>
                  <p className="mt-1 text-[15px] text-slate-500">Produto {r.produto}/5 · Entrega {r.entrega}/5 · Atendimento {r.atendimento}/5</p>
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
              <p className="mt-1 text-[17px] text-slate-600">
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
                const emFoco = predioEmFoco?.org_id === c.id;
                return (
                  <li
                    key={c.id}
                    className={`rounded-xl border p-4 text-[17px] ${emFoco ? 'border-tinta-600 bg-tinta-50/60 ring-1 ring-tinta-600' : 'border-slate-200'}`}
                  >
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
                    {/* Selecionar: é o que põe este prédio no cartão de cima. Um prédio por cartão é o
                        caso normal; havendo mais, escolhe-se qual. */}
                    {bs.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {bs.map((b) => {
                          const marcado = predioEmFoco?.id === b.id;
                          return (
                            <Link
                              key={b.id}
                              href={`/app/organizacoes/${org.id}?predio=${b.id}`}
                              scroll={false}
                              aria-current={marcado ? 'true' : undefined}
                              className={`rounded-lg border px-3 py-1.5 text-[15px] font-semibold ${
                                marcado ? 'border-tinta-600 bg-tinta-600 text-white' : 'border-slate-300 text-slate-700 hover:bg-slate-50'
                              }`}
                            >
                              {marcado ? '✓ ' : ''}
                              {b.nome_interno}
                            </Link>
                          );
                        })}
                      </div>
                    )}
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
            <p className="mt-3 text-[17px] text-slate-600">
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
            <ul className="mt-4 divide-y divide-slate-100 text-[17px]">
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
            <p className="mt-3 text-[17px] text-slate-600">
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
            <ul className="mt-4 divide-y divide-slate-100 text-[17px]">
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
            <p className="mt-3 text-[17px] text-slate-600">
              {buildings && buildings.length > 0
                ? 'Descreva a obra uma vez e receba propostas comparáveis.'
                : 'Registe primeiro um prédio para pedir orçamentos.'}
            </p>
          )}
        </section>
      )}

      {/* Condomínio, administradora e particular: a "Equipa" e os "Documentos de verificação" de
          sempre, sem separadores — a reorganização em "O meu Perfil" (acima) é só para pintor e
          fornecedor. */}
      {!isEmpresa && (
      <section className={card}>
        <h2 className="font-semibold">Equipa</h2>
        <ul className="mt-4 divide-y divide-slate-100 text-[17px]">
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
          <p className="mt-3 text-[15px] text-slate-500">A equipa da administradora que gere este condomínio também tem acesso.</p>
        )}

        {owner && invites && invites.length > 0 && (
          <div className="mt-4">
            <h3 className="text-[17px] font-semibold">Convites pendentes</h3>
            <ul className="mt-2 divide-y divide-slate-100 text-[17px]">
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
      )}

      {/* id/scroll-mt: destino do atalho "Preencher documento em falta" nas oportunidades
          (ProposalForms.tsx/[id]/page.tsx) — pedido do promotor, 23/10/2026, para quem vem de lá
          cair exatamente aqui, sem ter de procurar a secção. Para pintor/fornecedor esse atalho passou
          a apontar para `?ver=documentos`, que já cai no separador "Documentos" acima. */}
      {!isEmpresa && (
      <section id="documentos" className={`${card} scroll-mt-6`}>
        <h2 className="font-semibold">Documentos de verificação</h2>
        {missing.length > 0 ? (
          <div className="mt-3 rounded-xl border-2 border-amber-400 bg-amber-50 p-4 text-[17px]">
            <p className="font-semibold text-amber-900">
              {missing.length === 1 ? 'Falta um documento' : `Faltam ${missing.length} documentos`} para a verificação:
            </p>
            <ul className="mt-2 list-disc pl-5 text-amber-900">
              {missing.map((group) => (
                <li key={group.join('|')}>{group.map((k) => DOC_KIND_LABELS[k]).join(' ou ')}</li>
              ))}
            </ul>
            <p className="mt-2 text-amber-800">
              A maioria dos orçamentos sem este documento é eliminada pelos clientes antes de serem lidos. Submeta-o já aqui abaixo.
            </p>
          </div>
        ) : (
          org.kind !== 'particular' && (
            <p className="mt-3 text-[17px] text-slate-600">Todos os documentos pedidos foram submetidos.</p>
          )
        )}

        {docs && docs.length > 0 && (
          <ul className="mt-4 divide-y divide-slate-100 text-[17px]">
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
        {role && role !== 'leitor' && (org.kind === 'pintor' || org.kind === 'fornecedor') && (
          <div className="mt-6 border-t border-slate-100 pt-6">
            <LogotipoDaEmpresa orgId={org.id} url={logotipoUrl} />
          </div>
        )}
      </section>
      )}
    </div>
  );
}
