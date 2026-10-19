import Link from "next/link";
import { BrandMark } from "@/components/BrandMark";
import { BRAND } from "@/config/brand";
import { safeNext } from "@/lib/redirect";
import { supabaseConfigured } from "@/lib/supabase/env";
import { SignInForm } from "./SignInForm";

export const metadata = { title: `Entrar — ${BRAND.name}` };

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ seguinte?: string; erro?: string }>;
}) {
  const { seguinte, erro } = await searchParams;
  return (
    <main className="mx-auto max-w-md px-4 py-16">
      <Link href="/" className="inline-block">
        <BrandMark />
      </Link>
      <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-7">
        <p className="eyebrow">Área de trabalho</p>
        <h1 className="mt-2 text-2xl font-semibold">Entrar</h1>
        <p className="mt-2 text-sm text-slate-600">
          Sem palavra-passe: enviamos um link de entrada para o seu email. Se
          ainda não tem conta, é criada agora.
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
            <p className="text-sm text-red-700">
              A ligação à base de dados não está configurada neste ambiente.
            </p>
          )}
        </div>
      </div>
      <p className="mt-6 text-center text-xs text-slate-500">
        Do pedido à última demão.
      </p>
    </main>
  );
}
