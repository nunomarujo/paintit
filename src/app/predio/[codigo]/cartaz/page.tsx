import { notFound } from 'next/navigation';
import { BRAND } from '@/config/brand';
import { qrCodeSvg } from '@/lib/qrcode';
import { createClient } from '@/lib/supabase/server';
import { Imprimir } from './Imprimir';

export const metadata = { title: `Cartaz do prédio — ${BRAND.name}` };

/** Folha A4 para afixar na entrada do prédio: o QR, o link e três frases. Imprime-se do navegador. */
export default async function CartazPage({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params;
  const supabase = await createClient();
  const { data } = await supabase.rpc('predio_por_codigo', { p_codigo: codigo });
  const predio = data?.[0];
  if (!predio) notFound();
  const url = `${BRAND.url}/predio/${codigo}`;

  return (
    <main className="mx-auto flex min-h-screen max-w-[210mm] flex-col items-center justify-center px-10 py-14 text-center print:min-h-0">
      <p className="text-[20px] font-semibold text-slate-600">{predio.condominio}</p>
      <h1 className="mt-2 text-[34px] leading-tight font-semibold">Obras de pintura em {predio.nome_interno}</h1>
      <p className="mt-6 max-w-[54ch] text-[20px] text-slate-700">
        Acompanhe o pedido de orçamentos, leia as propostas quando abrirem e vote na que prefere. Aponte a câmara do
        telemóvel ao código.
      </p>
      <div className="mt-10 w-64" dangerouslySetInnerHTML={{ __html: qrCodeSvg(url, `Código QR do prédio ${predio.nome_interno}`) }} />
      <p className="mt-6 break-all font-mono text-[17px] text-slate-700">{url}</p>
      <p className="mt-10 text-[15px] text-slate-500">
        As propostas abrem para todos ao mesmo tempo — condóminos e administração. Até lá vê-se só o andamento.
      </p>
      <p className="mt-2 text-[15px] text-slate-500">{BRAND.name} · {BRAND.domain}</p>
      <Imprimir />
    </main>
  );
}
