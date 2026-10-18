import Link from 'next/link';
import { BRAND } from '@/config/brand';
import { safeNext } from '@/lib/redirect';
import { supabaseConfigured } from '@/lib/supabase/env';
import { SignInForm } from './SignInForm';

export const metadata = { title: `Entrar — ${BRAND.name}` };

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ seguinte?: string; erro?: string }> }) {
  const { seguinte, erro } = await searchParams;
  return (
    <main className="mx-auto max-w-sm px-4 py-16">
      <Link href="/" className="text-lg font-semibold text-tinta-700">
        {BRAND.name}
      </Link>
      <h1 className="mt-8 text-2xl font-semibold">Entrar</h1>
      <p className="mt-2 text-sm text-slate-600">
        Sem palavra-passe: enviamos um link de entrada para o seu email. Se ainda não tem conta, é criada agora.
      </p>
      {erro && (
        <p className="mt-4 text-sm text-red-700" role="alert">
          O link expirou ou já foi usado. Peça um novo.
        </p>
      )}
      <div className="mt-6">
        {supabaseConfigured ? (
          <SignInForm next={safeNext(seguinte)} />
        ) : (
          <p className="text-sm text-red-700">A ligação à base de dados não está configurada neste ambiente.</p>
        )}
      </div>
    </main>
  );
}
