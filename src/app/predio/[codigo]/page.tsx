import Link from 'next/link';
import { BrandMark } from '@/components/BrandMark';
import { BRAND } from '@/config/brand';
import { createClient } from '@/lib/supabase/server';
import { FormularioDeEntrada } from './FormularioDeEntrada';

export const metadata = { title: `Acesso ao prédio — ${BRAND.name}` };

/**
 * A página do QR do prédio. Quem a abre ainda não tem conta: vê o prédio pelo nome e pelo
 * concelho (nunca a morada), escreve a fração, o andar, o email e o telemóvel, e recebe o link de
 * entrada. O acesso que daí resulta é a este prédio e só a ele.
 */
export default async function PredioPage({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params;
  const supabase = await createClient();
  const { data } = await supabase.rpc('predio_por_codigo', { p_codigo: codigo });
  const predio = data?.[0];

  return (
    <main className="mx-auto max-w-md px-4 py-12">
      <Link href="/" className="inline-block">
        <BrandMark />
      </Link>
      <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 sm:p-7">
        {!predio ? (
          <>
            <p className="eyebrow">Acesso ao prédio</p>
            <h1 className="mt-2 text-[26px] leading-tight font-semibold">Código inválido</h1>
            <p className="mt-2 text-[17px] text-slate-600">Este código já não está activo. Peça um novo à administração do condomínio.</p>
          </>
        ) : (
          <>
            <p className="eyebrow">Acesso de condómino</p>
            <h1 className="mt-2 text-[26px] leading-tight font-semibold">{predio.nome_interno}</h1>
            <p className="mt-1 text-[17px] text-slate-600">
              {predio.condominio} · {predio.concelho}
            </p>
            <p className="mt-4 text-[17px] text-slate-700">
              A administração abriu o acompanhamento das obras de pintura deste prédio aos condóminos: ver em que ponto está
              o pedido, ler as propostas quando abrirem — todas ao mesmo tempo, para toda a gente — e votar na preferida.
            </p>
            <div className="mt-6">
              <FormularioDeEntrada codigo={codigo} />
            </div>
          </>
        )}
      </div>
    </main>
  );
}
