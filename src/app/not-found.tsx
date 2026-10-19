import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="mx-auto max-w-xl px-4 py-24 text-center">
      <h1 className="text-2xl font-semibold">Página não encontrada</h1>
      <p className="mt-2 text-slate-600">O endereço pode estar errado ou a página já não existir.</p>
      <Link href="/" className="mt-6 inline-block font-medium text-tinta-700 hover:underline">
        Voltar ao início
      </Link>
    </main>
  );
}
