import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { signOut } from '@/app/entrar/actions';
import { AppNav, type NavItem } from '@/components/AppNav';
import { MobileNavMenu } from '@/components/MobileNavMenu';
import { SidebarResizer } from '@/components/SidebarResizer';
import { contarOrcamentosPorEnviar } from '@/lib/queries';
import { StrikeDialog } from '@/components/StrikeDialog';
import { BrandMark } from '@/components/BrandMark';
import { isPlatformAdmin } from '@/lib/access';
import { queueCounts } from '@/lib/backofficeCounts';
import { appealView } from '@/lib/strikes';
import { getUser } from '@/lib/supabase/server';
// Os ícones já não entram aqui como componente: o layout é de servidor e o AppNav é de cliente, e
// uma função não atravessa essa fronteira (produção em baixo a 26/10/2026, 12:49 — ver NavIcons.tsx,
// `ICONES`). Pede-se o ícone pelo nome (string); o cliente resolve-o.

export default async function AppLayout({ children }: { children: ReactNode }) {
  const { supabase, user } = await getUser();
  if (!user) redirect('/entrar');
  // Conta bloqueada por tentativas de partilhar contactos: sai e não volta (src/domain/strikes.ts).
  const { data: blocked } = await supabase.from('blocked_users').select('user_id').eq('user_id', user.id).maybeSingle();
  if (blocked) {
    await supabase.auth.signOut();
    redirect('/conta-bloqueada');
  }

  const { count: strikes } = await supabase.from('contact_violations').select('id', { count: 'exact', head: true }).eq('user_id', user.id).is('anulada_em', null);
  const lastWarning = strikes === 2 ? await appealView(supabase, user.id) : null;
  const [admin, { data: memberships }, { count: unread }] = await Promise.all([
    isPlatformAdmin(supabase, user.id),
    // `nome` entra aqui (26/10/2026) para o cartão "O meu Perfil" no rodapé mostrar o nome da empresa,
    // não o email — é o único sítio do layout que precisa dele.
    supabase.from('org_members').select('organizations!inner(id, kind, nome)').eq('user_id', user.id),
    supabase.from('notifications').select('id', { count: 'exact', head: true }).is('lida_em', null),
  ]);
  const kinds = new Set((memberships ?? []).map((m) => m.organizations.kind));
  const client = kinds.has('condominio') || kinds.has('administradora') || kinds.has('particular');
  // Uma conta de fornecedor é sempre uma só entidade (allowedOrgKinds em organization.ts).
  const fornecedorOrg = (memberships ?? []).find((m) => m.organizations.kind === 'fornecedor')?.organizations;
  const pintorOrg = (memberships ?? []).find((m) => m.organizations.kind === 'pintor')?.organizations;
  const fornecedorId = fornecedorOrg?.id;
  const pintorId = pintorOrg?.id;
  const meuPerfil = pintorOrg ?? fornecedorOrg ?? null;
  const porEnviar = pintorId ? await contarOrcamentosPorEnviar(supabase, pintorId) : 0;

  // Estrutura e rotas do caderno de desenho da interface (26/10/2026, protótipo do promotor:
  // QuemPinta_Desenho_Interface.html, secção "Menus e larguras") — um perfil, um agrupamento. Dois
  // níveis chegam: grupo + destino; o que antes era um nível a mais (quem contrata/concursos,
  // novo/preenchimento/enviados/arquivo) passa a separador local dentro da própria página
  // (src/app/app/obras-publicas/page.tsx, src/app/app/orcamentos/page.tsx).
  //
  // Nota: isto repõe "Obra pública" como destino visível no menu, invertendo a descida a filho de
  // 23/10/2026 registada abaixo — por ser o que o caderno pede; a confirmar com o promotor.
  const dia: NavItem[] = [{ href: '/app', label: 'Início', icon: 'casa', count: unread ?? 0 }];
  if (client) dia.push({ href: '/app/pedidos', label: 'Pedidos de orçamento', icon: 'recibo' });
  if (kinds.has('pintor')) dia.push({ href: '/app/obras', label: 'Gestão de obra', icon: 'capacete' });
  if (kinds.has('fornecedor')) dia.push({ href: '/app/encomendas', label: 'Encomendas', icon: 'recibo' });
  if (fornecedorId) dia.push({ href: '/app/levantamentos', label: 'Levantamentos', icon: 'caixa' });

  // Ganhar obra agrupa o percurso comercial do pintor: Oportunidades → Obra pública → Orçamentos →
  // Contratações (ordem do caderno, "Agrupa o trabalho a conquistar e formalizar").
  const ganharObra: NavItem[] = [];
  if (kinds.has('pintor')) {
    ganharObra.push(
      { href: '/app/oportunidades', label: 'Oportunidades', icon: 'lupa' },
      { href: '/app/obras-publicas', label: 'Obra pública', icon: 'publico' },
      { href: '/app/orcamentos', label: 'Orçamentos', icon: 'recibo', aviso: porEnviar > 0 },
      { href: '/app/contratacoes', label: 'Contratações', icon: 'documento' },
    );
  }
  // Cliente sem conta de pintor: Contratações fica no único grupo (caderno, perfil "Cliente").
  if (client && !kinds.has('pintor')) dia.push({ href: '/app/contratacoes', label: 'Contratações', icon: 'documento' });

  // Materiais (pintor): catálogo para procurar produtos, armazém para o que já existe na empresa.
  const materiais: NavItem[] = [];
  // Vender / Adesões (fornecedor): operações antes da manutenção; comissões de adesão à parte.
  const vender: NavItem[] = [];
  const adesoes: NavItem[] = [];
  if (kinds.has('fornecedor')) {
    vender.push({ href: '/app/catalogo', label: 'Catálogo', icon: 'caixa' });
  } else if (kinds.size > 0) {
    materiais.push({ href: '/app/catalogo', label: 'Catálogo de materiais', icon: 'caixa' });
  }
  if (kinds.has('pintor')) materiais.push({ href: '/app/obras/consumiveis', label: 'Armazém e consumíveis', icon: 'caixa' });
  if (fornecedorId) {
    vender.push(
      { href: `/app/organizacoes/${fornecedorId}/produtos`, label: 'Produtos e descontos', icon: 'recibo' },
      { href: `/app/organizacoes/${fornecedorId}/clientes`, label: 'Clientes', icon: 'pessoas' },
    );
    adesoes.push({ href: `/app/organizacoes/${fornecedorId}/adesoes`, label: 'Comissões de adesão', icon: 'percentagem' });
  }
  // Equipa da plataforma: o backoffice organizado por secções, com o que espera por uma pessoa em cada uma.
  const q = admin ? await queueCounts(supabase) : null;
  const backoffice: NavItem[] = q
    ? [
        { href: '/app/backoffice', label: 'Painel', icon: 'mostrador', exact: true },
        { href: '/app/backoffice/pedidos', label: 'Pedidos', icon: 'entrada', count: q.denuncias + q.fotografias },
        { href: '/app/backoffice/entidades', label: 'Entidades', icon: 'predio', count: q.documentos + q.regimes },
        { href: '/app/backoffice/contratacoes', label: 'Contratações', icon: 'documento' },
        { href: '/app/backoffice/moderacao', label: 'Moderação', icon: 'balanca', count: q.revisoes },
        { href: '/app/backoffice/contabilidade', label: 'Contabilidade', icon: 'calculadora', count: q.resgates + q.banco },
        { href: '/app/backoffice/sistema', label: 'Sistema', icon: 'servidor' },
      ]
    : [];
  // Título do primeiro grupo: "Acompanhar a obra" é o nome do caderno para o perfil cliente puro
  // (sem conta de pintor nem de fornecedor); as restantes contas ficam com "Dia a dia".
  const soCliente = client && !kinds.has('pintor') && !kinds.has('fornecedor');
  // Uma conta só de equipa (sem entidades) vê só o backoffice.
  const groups = [
    ...(admin && kinds.size === 0 ? [] : [{ title: soCliente ? 'Acompanhar a obra' : 'Dia a dia', items: dia }]),
    ...(ganharObra.length ? [{ title: 'Ganhar obra', items: ganharObra }] : []),
    ...(materiais.length ? [{ title: 'Materiais', items: materiais }] : []),
    ...(vender.length ? [{ title: 'Vender', items: vender }] : []),
    ...(adesoes.length ? [{ title: 'Adesões', items: adesoes }] : []),
    ...(admin ? [{ title: 'Backoffice', items: backoffice }] : []),
  ];

  async function leave() {
    'use server';
    await signOut();
    redirect('/');
  }

  return (
    <div className="min-h-screen md:grid md:grid-cols-[var(--sidebar-w,235px)_minmax(0,1fr)] print:block">
      <aside className="print:hidden relative border-b border-marca-border bg-marca-cream px-4 py-2.5 md:sticky md:top-0 md:flex md:h-screen md:flex-col md:border-b-0 md:border-r md:px-[18px] md:py-6">
        {/* Largura ajustável (pedido do promotor, 26/10/2026): arrastar esta borda muda
            `--sidebar-w`, que o grid acima lê. `SidebarResizer.tsx` tem o porquê. */}
        <SidebarResizer />
        {/* Em telemóvel o botão de navegação fica aqui, no canto superior direito, ao lado da marca
            (pedido do promotor, 26/10/2026, depois de ver a app ao vivo) — não mais a barra lateral
            inteira a abrir por baixo do conteúdo. `MobileNavMenu.tsx` já se esconde sozinho em ecrã
            largo (`md:hidden`); esta linha só existe para o alinhar à direita da marca em telemóvel. */}
        <div className="flex items-center justify-between md:block">
          <Link href="/app" className="block px-1 md:px-3">
            <BrandMark tone="marca" />
          </Link>
          <MobileNavMenu
            groups={groups}
            meuPerfil={meuPerfil}
            email={user.email ?? ''}
            mostrarSubscricao={kinds.has('pintor')}
            pintorId={pintorId}
            leave={leave}
          />
        </div>
        <p className="eyebrow mb-5 mt-2 hidden px-3 text-marca-muted md:block">Empreitadas de pintura</p>
        <div className="mt-3 md:mt-0">
          <AppNav groups={groups} />
        </div>
        {/* Empresa e conta: no rodapé, sem ocupar o centro do menu (caderno de desenho, 26/10/2026).
            Pintor ou fornecedor: um só cartão "O meu Perfil", com o nome da empresa (não o email) —
            é lá dentro, em separadores, que ficam os dados da entidade, os documentos e a equipa online
            (26/10/2026, docs/DECISOES.md). O cliente puro não tem empresa a mostrar: continua a ver o
            email e o link "Perfil" de sempre. Só em ecrã largo (26/10/2026): em telemóvel o mesmo
            conteúdo já está no `MobileNavMenu` acima — ter os dois seria dois sítios diferentes para a
            mesma coisa. */}
        <div className="mt-auto hidden border-t border-marca-border px-3 pt-4 text-[15px] md:block">
          {meuPerfil ? (
            <Link
              href={`/app/organizacoes/${meuPerfil.id}`}
              className="-mx-1 block rounded-[9px] px-1 py-1.5 hover:bg-marca-cream/60"
            >
              <span className="block text-marca-muted">O meu Perfil</span>
              <span className="block truncate font-semibold text-marca-ink">{meuPerfil.nome}</span>
            </Link>
          ) : (
            <p className="truncate px-1 font-semibold text-marca-ink">{user.email}</p>
          )}
          <nav aria-label="Empresa e conta" className="mt-2 space-y-0.5">
            {kinds.has('pintor') && (
              <Link href="/app/subscricao" className="block rounded-[9px] px-1 py-1 text-marca-muted hover:text-marca-ink">
                Plano e subscrição
              </Link>
            )}
            {pintorId && (
              <Link href={`/app/organizacoes/${pintorId}/referencias`} className="block rounded-[9px] px-1 py-1 text-marca-muted hover:text-marca-ink">
                Referências de fornecedores
              </Link>
            )}
            {!meuPerfil && (
              <Link href="/app/perfil" className="block rounded-[9px] px-1 py-1 text-marca-muted hover:text-marca-ink">
                Perfil
              </Link>
            )}
          </nav>
          <form action={leave} className="mt-2 border-t border-marca-border pt-2">
            <button type="submit" className="px-1 text-[17px] font-semibold text-marca-orange-deep hover:underline">
              Sair
            </button>
          </form>
        </div>
      </aside>
      <div className="min-w-0">
        <header className="print:hidden sticky top-0 z-20 flex items-center gap-2 border-b border-slate-200 bg-paper/95 px-4 py-3 backdrop-blur md:px-8">
          {/* "Perfil"/"Sair" já vivem só no botão de navegação da marca em telemóvel
              (`MobileNavMenu.tsx`, 26/10/2026) — não há mais nada a competir por espaço aqui. */}
          <i className="inline-block h-[7px] w-[7px] shrink-0 rounded-full bg-[#648d75]" />
          <span className="truncate text-[15px] text-slate-500">Versão de teste · pagamentos em modo de teste</span>
        </header>
        <main className="mx-auto max-w-[1600px] px-4 py-5 md:px-6">
          {lastWarning && (
            <p className="mb-6 rounded-xl border border-red-300 bg-red-50 p-3 text-[17px] text-red-900" role="status">
              <b>Último aviso:</b> a conta tentou partilhar contactos ou contornar a plataforma. Uma nova tentativa bloqueia-a de forma
              permanente.{' '}
              {lastWarning.eligible ? (
                <Link href="/app/revisao" className="font-semibold underline">
                  Se foi um engano, pedir revisão do segundo aviso
                </Link>
              ) : lastWarning.appeal ? (
                <Link href="/app/revisao" className="font-semibold underline">
                  Ver o pedido de revisão ({lastWarning.appeal.estado === 'pendente' ? 'em análise' : lastWarning.appeal.estado === 'aceite' ? 'aceite' : 'recusado'})
                </Link>
              ) : null}
            </p>
          )}
          {children}
        </main>
        <StrikeDialog />
      </div>
    </div>
  );
}
