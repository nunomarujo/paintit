import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { signOut } from '@/app/entrar/actions';
import { AppNav, type NavItem } from '@/components/AppNav';
import { contarOrcamentosPorEnviar } from '@/lib/queries';
import { StrikeDialog } from '@/components/StrikeDialog';
import { BrandMark } from '@/components/BrandMark';
import { isPlatformAdmin } from '@/lib/access';
import { queueCounts } from '@/lib/backofficeCounts';
import { appealView } from '@/lib/strikes';
import { getUser } from '@/lib/supabase/server';

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
    supabase.from('org_members').select('organizations!inner(id, kind)').eq('user_id', user.id),
    supabase.from('notifications').select('id', { count: 'exact', head: true }).is('lida_em', null),
  ]);
  const kinds = new Set((memberships ?? []).map((m) => m.organizations.kind));
  const client = kinds.has('condominio') || kinds.has('administradora') || kinds.has('particular');
  // Uma conta de fornecedor é sempre uma só entidade (allowedOrgKinds em organization.ts).
  const fornecedorId = (memberships ?? []).find((m) => m.organizations.kind === 'fornecedor')?.organizations.id;
  const pintorId = (memberships ?? []).find((m) => m.organizations.kind === 'pintor')?.organizations.id;
  const porEnviar = pintorId ? await contarOrcamentosPorEnviar(supabase, pintorId) : 0;

  // Cada conta vê o que lhe diz respeito; uma conta sem entidades vê só o início.
  const work: NavItem[] = [{ href: '/app', label: 'Início', count: unread ?? 0 }];
  if (client) work.push({ href: '/app/pedidos', label: 'Pedidos de orçamento' });
  if (kinds.has('pintor')) work.push({ href: '/app/oportunidades', label: 'Oportunidades' });
  // Obra pública e obra privada são a mesma intenção — ganhar obra — com origens diferentes, por isso
  // fica ao lado de Oportunidades e não perdida nos recursos (desenho de 25/10/2026).
  if (kinds.has('pintor')) work.push({ href: '/app/obras-publicas', label: 'Obras públicas' });
  // Os orçamentos a clientes próprios são trabalho diário, não um recurso: ficam na área de trabalho.
  if (kinds.has('pintor'))
    work.push({
      href: '/app/orcamentos',
      label: 'Orçamentos',
      children: [
        { href: '/app/orcamentos?ver=novo', label: 'Novo orçamento' },
        { href: '/app/orcamentos?ver=feitos&grupo=preenchimento', label: 'Em preenchimento', aviso: porEnviar > 0 },
        { href: '/app/orcamentos?ver=feitos&grupo=enviados', label: 'Enviados' },
        { href: '/app/orcamentos?ver=feitos&grupo=arquivo', label: 'Arquivo' },
      ],
    });
  if (client || kinds.has('pintor')) work.push({ href: '/app/contratacoes', label: 'Contratações' });
  if (kinds.has('fornecedor')) work.push({ href: '/app/encomendas', label: 'Encomendas' });
  if (fornecedorId) work.push({ href: '/app/levantamentos', label: 'Levantamentos' });
  const more: NavItem[] = kinds.size > 0 ? [{ href: '/app/catalogo', label: 'Catálogo de materiais' }] : [];
  if (kinds.has('pintor')) {
    more.push({ href: '/app/obras', label: 'Ferramentas de obra' });
    more.push({ href: '/app/subscricao', label: 'Plano da empresa' });
    // Referências de fornecedores: é o pintor que indica um fornecedor (desconto na própria comissão) —
    // a página (`/app/organizacoes/[id]/referencias/page.tsx`) só existe para `org.kind === 'pintor'`.
    // Este link apontava por erro para a entidade do fornecedor (abaixo), onde dava sempre 404 — link
    // partido encontrado na auditoria de UX de 23/10/2026. Uma conta de pintor é sempre uma só empresa
    // (allowedOrgKinds em organization.ts), por isso usa-se o mesmo padrão de `fornecedorId` abaixo.
    const pintorId = (memberships ?? []).find((m) => m.organizations.kind === 'pintor')?.organizations.id;
    if (pintorId) more.push({ href: `/app/organizacoes/${pintorId}/referencias`, label: 'Referências de fornecedores' });
  }
  if (fornecedorId) {
    more.push(
      { href: `/app/organizacoes/${fornecedorId}/produtos`, label: 'Produtos e descontos' },
      { href: `/app/organizacoes/${fornecedorId}/clientes`, label: 'Clientes' },
      { href: `/app/organizacoes/${fornecedorId}/adesoes`, label: 'Comissões de adesão' },
    );
  }
  // Equipa da plataforma: o backoffice organizado por secções, com o que espera por uma pessoa em cada uma.
  const q = admin ? await queueCounts(supabase) : null;
  const backoffice: NavItem[] = q
    ? [
        { href: '/app/backoffice', label: 'Painel', exact: true },
        { href: '/app/backoffice/pedidos', label: 'Pedidos', count: q.denuncias + q.fotografias },
        { href: '/app/backoffice/entidades', label: 'Entidades', count: q.documentos + q.regimes },
        { href: '/app/backoffice/contratacoes', label: 'Contratações' },
        { href: '/app/backoffice/moderacao', label: 'Moderação', count: q.revisoes },
        { href: '/app/backoffice/contabilidade', label: 'Contabilidade', count: q.resgates + q.banco },
        { href: '/app/backoffice/sistema', label: 'Sistema' },
      ]
    : [];
  // Uma conta só de equipa (sem entidades) vê só o backoffice.
  const groups = [
    ...(admin && kinds.size === 0 ? [] : [{ title: 'Área de trabalho', items: work }]),
    ...(more.length ? [{ title: 'Recursos', items: more }] : []),
    ...(admin ? [{ title: 'Backoffice', items: backoffice }] : []),
  ];

  async function leave() {
    'use server';
    await signOut();
    redirect('/');
  }

  return (
    <div className="min-h-screen md:grid md:grid-cols-[235px_minmax(0,1fr)] print:block">
      <aside className="print:hidden border-b border-slate-200 bg-white px-4 py-4 md:sticky md:top-0 md:flex md:h-screen md:flex-col md:border-b-0 md:border-r md:px-[18px] md:py-7">
        <Link href="/app" className="block px-1 md:px-3">
          <BrandMark />
        </Link>
        <p className="eyebrow mb-8 mt-2 hidden px-3 md:block">Empreitadas de pintura</p>
        <div className="mt-3 md:mt-0">
          <AppNav groups={groups} />
        </div>
        <div className="mt-auto hidden border-t border-slate-200 px-3 pt-5 text-sm md:block">
          <Link href="/app/perfil" className="block truncate font-semibold text-slate-900 hover:underline">
            {user.email}
          </Link>
          <p className="mt-1 text-xs text-slate-500">Do pedido à última demão.</p>
          <form action={leave} className="mt-3">
            <button type="submit" className="text-[13px] font-semibold text-tinta-600 hover:underline">
              Sair
            </button>
          </form>
        </div>
      </aside>
      <div className="min-w-0">
        <header className="print:hidden sticky top-0 z-20 flex items-center justify-between gap-4 border-b border-slate-200 bg-paper/95 px-4 py-3 backdrop-blur md:px-8">
          <span className="flex items-center gap-2 text-[11px] text-slate-500">
            <i className="inline-block h-[7px] w-[7px] rounded-full bg-[#648d75]" />
            Versão de teste · pagamentos em modo de teste
          </span>
          <span className="flex items-center gap-3 md:hidden">
            <Link href="/app/perfil" className="text-[12px] text-slate-600">
              Perfil
            </Link>
            <form action={leave}>
              <button type="submit" className="text-[12px] font-semibold text-tinta-600">
                Sair
              </button>
            </form>
          </span>
        </header>
        <main className="mx-auto max-w-[1180px] px-4 py-8 md:px-9">
          {lastWarning && (
            <p className="mb-6 rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-900" role="status">
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
