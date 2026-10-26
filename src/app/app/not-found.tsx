import Link from 'next/link';

// Também aparece quando a conta não tem acesso: as regras da base de dados escondem o que não é seu.
export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl py-16 text-center">
      <h1 className="text-[26px] leading-tight font-semibold">Não encontrado</h1>
      <p className="mt-2 text-slate-600">Esta página não existe ou a sua conta não tem acesso a ela.</p>
      <Link href="/app" className="mt-6 inline-block font-medium text-tinta-700 hover:underline">
        Voltar às suas entidades
      </Link>
    </div>
  );
}
