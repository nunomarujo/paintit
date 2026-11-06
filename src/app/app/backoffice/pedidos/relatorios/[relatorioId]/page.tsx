import { notFound } from 'next/navigation';
import { getUser } from '@/lib/supabase/server';

export default async function RelatorioEmitido({ params }: { params: Promise<{ relatorioId: string }> }) {
  const { relatorioId } = await params;
  const { supabase } = await getUser();
  const { data: r } = await supabase.from('relatorios_do_percurso').select('*').eq('id', relatorioId).maybeSingle();
  if (!r) notFound();
  return (
    <div className="space-y-4">
      <pre className="whitespace-pre-wrap rounded-2xl border border-slate-200 bg-white p-5 font-sans text-[15px] leading-relaxed text-slate-900">{r.conteudo}</pre>
      <p className="break-all text-[13px] text-slate-600">SHA-256 guardado na emissão: {r.sha256}</p>
    </div>
  );
}
