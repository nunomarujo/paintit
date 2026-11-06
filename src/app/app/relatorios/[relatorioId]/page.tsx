import { notFound } from 'next/navigation';
import { Voltar } from '@/components/Voltar';
import { getUser } from '@/lib/supabase/server';

// Um relatório do percurso negocial entregue a quem o pediu — o dono da obra ou o empreiteiro (06/11/2026):
// o texto tal como foi emitido e a impressão digital guardada na emissão. A regra de acesso da base só o
// mostra à entidade que o pediu e à equipa.
export default async function RelatorioEntregue({ params }: { params: Promise<{ relatorioId: string }> }) {
  const { relatorioId } = await params;
  const { supabase } = await getUser();
  const { data: r } = await supabase.from('relatorios_do_percurso').select('*').eq('id', relatorioId).maybeSingle();
  if (!r) notFound();
  const { data: contratacao } = r.destinatario === 'pintor' ? await supabase.from('engagements').select('id').eq('request_id', r.request_id).limit(1).maybeSingle() : { data: null };
  return (
    <div className="space-y-6">
      <Voltar href={r.destinatario === 'pintor' && contratacao ? `/app/contratacoes/${contratacao.id}` : `/app/pedidos/${r.request_id}`}>
        {r.destinatario === 'pintor' ? 'Contrato' : 'Pedido'}
      </Voltar>
      <h1 className="text-[24px] font-semibold">Relatório do percurso negocial</h1>
      <p className="max-w-[54ch] text-[17px] text-slate-700">
        Um registo do que aconteceu na plataforma nesta obra, por ordem e com as datas do servidor. Versão {r.versao}.
      </p>
      <pre className="whitespace-pre-wrap rounded-2xl border border-slate-200 bg-white p-5 font-sans text-[15px] leading-relaxed text-slate-900">{r.conteudo}</pre>
      <p className="break-all text-[13px] text-slate-600">Impressão digital (SHA-256) do texto acima, guardada na emissão: {r.sha256}</p>
    </div>
  );
}
