import Link from 'next/link';
import { BrandMark } from '@/components/BrandMark';
import { BRAND } from '@/config/brand';

export const metadata = { title: `Conta bloqueada · ${BRAND.name}` };

export default function BlockedPage() {
  return (
    <main className="mx-auto max-w-md px-4 py-16">
      <Link href="/" className="inline-block">
        <BrandMark />
      </Link>
      <div className="mt-8 rounded-2xl border border-red-200 bg-white p-7">
        <h1 className="text-2xl font-semibold">Conta bloqueada</h1>
        <p className="mt-3 text-sm text-slate-700">
          Esta conta foi bloqueada por tentativas repetidas de partilhar contactos ou de contornar a plataforma antes da
          apresentação, o que as condições de utilização não permitem.
        </p>
        <p className="mt-3 text-sm text-slate-600">
          Se considera que foi um engano, escreva para{' '}
          <a href={`mailto:${BRAND.email}`} className="text-tinta-700 underline">
            {BRAND.email}
          </a>
          . A equipa analisa cada caso.
        </p>
      </div>
    </main>
  );
}
