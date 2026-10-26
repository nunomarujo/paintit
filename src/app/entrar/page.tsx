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
        <h1 className="mt-2 text-[26px] leading-tight font-semibold">Entrar</h1>
        <p className="mt-2 text-[17px] text-slate-600">
          Entre com email e palavra-passe, crie uma conta nova ou, se preferir,
          receba um link de entrada por email.
        </p>
        {erro && (
          <p className="mt-4 text-[17px] text-red-700" role="alert">
            O link expirou ou já foi usado. Peça um novo.
          </p>
        )}
        <div className="mt-6">
          {supabaseConfigured ? (
            <SignInForm next={safeNext(seguinte)} />
          ) : (
            <p className="text-[17px] text-red-700">
              A ligação à base de dados não está configurada neste ambiente.
            </p>
          )}
        </div>
      </div>
      <p className="mt-6 text-center text-[15px] text-slate-500">
        Do pedido à última demão.
      </p>
    </main>
  );
}
