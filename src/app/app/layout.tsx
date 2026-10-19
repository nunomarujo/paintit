import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { signOut } from '@/app/entrar/actions';
import { AppNav, type NavItem } from '@/components/AppNav';
import { BrandMark } from '@/components/BrandMark';
import { isPlatformAdmin } from '@/lib/access';
import { getUser } from '@/lib/supabase/server';

export default async function AppLayout({ children }: { children: ReactNode }) {
  const { supabase, user } = await getUser();
  if (!user) redirect('/entrar');

  const [admin, { data: memberships }, { count: unread }] = await Promise.all([
    isPlatformAdmin(supabase, user.id),
    supabase.from('org_members').select('organizations!inner(kind)').eq('user_id', user.id),
    supabase.from('notifications').select('id', { count: 'exact', head: true }).is('lida_em', null),
  ]);
  const kinds = new Set((memberships ?? []).map((m) => m.organizations.kind));
  const client = kinds.has('condominio') || kinds.has('administradora') || kinds.has('particular');

  // Cada conta vê o que lhe diz respeito; uma conta sem entidades vê só o início.
  const work: NavItem[] = [{ href: '/app', label: 'Início', count: unread ?? 0 }];
  if (client) work.push({ href: '/app/pedidos', label: 'Pedidos de orçamento' });
  if (kinds.has('pintor')) work.push({ href: '/app/oportunidades', label: 'Oportunidades' });
  if (client || kinds.has('pintor')) work.push({ href: '/app/contratacoes', label: 'Contratações' });
  if (kinds.has('fornecedor')) work.push({ href: '/app/encomendas', label: 'Encomendas' });
  const more: NavItem[] = kinds.size > 0 ? [{ href: '/app/catalogo', label: 'Catálogo de materiais' }] : [];
  if (kinds.has('pintor')) more.push({ href: '/app/obras', label: 'Ferramentas de obra' });
  const groups = [
    { title: 'Área de trabalho', items: work },
    ...(more.length ? [{ title: 'Recursos', items: more }] : []),
    ...(admin ? [{ title: 'Plataforma', items: [{ href: '/app/backoffice', label: 'Backoffice' }] }] : []),
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
        <main className="mx-auto max-w-[1180px] px-4 py-8 md:px-9">{children}</main>
      </div>
    </div>
  );
}
