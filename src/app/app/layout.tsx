import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { BRAND } from '@/config/brand';
import { signOut } from '@/app/entrar/actions';
import { isPlatformAdmin } from '@/lib/access';
import { getUser } from '@/lib/supabase/server';

export default async function AppLayout({ children }: { children: ReactNode }) {
  const { supabase, user } = await getUser();
  if (!user) redirect('/entrar');
  const admin = await isPlatformAdmin(supabase, user.id);

  async function leave() {
    'use server';
    await signOut();
    redirect('/');
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 px-4 py-3">
          <Link href="/app" className="font-semibold text-tinta-700">
            {BRAND.name}
          </Link>
          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
            <Link href="/app/oportunidades" className="hover:underline">
              Oportunidades
            </Link>
            <Link href="/app/contratacoes" className="hover:underline">
              Contratações
            </Link>
            {admin && (
              <Link href="/app/validacao" className="font-medium text-tinta-700 hover:underline">
                Validação
              </Link>
            )}
            <Link href="/app/perfil" className="truncate hover:underline">
              {user.email}
            </Link>
            <form action={leave}>
              <button type="submit" className="rounded-lg border border-slate-300 px-3 py-1 hover:bg-slate-100">
                Sair
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}
