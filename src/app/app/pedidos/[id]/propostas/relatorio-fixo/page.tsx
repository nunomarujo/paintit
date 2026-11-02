import { notFound } from 'next/navigation';
import { Voltar } from '@/components/Voltar';
import { RelatorioCongeladoView } from '@/components/RelatorioCongeladoView';
import { BRAND } from '@/config/brand';
import { canManage, myRole } from '@/lib/access';
import { getUser } from '@/lib/supabase/server';
import { obterOuGerarRelatorioCongelado } from '@/lib/relatorioCongelado';
import { avisoDeIntegridade, enderecoPublico, linhaDeFicha, reconstroiFicha, type DadosDaFichaGuardada } from '@/domain/relatorioCongelado';
import { qrCodeSvg } from '@/lib/qrcode';
import { estadoDaEntrega } from '@/domain/entrega';
import { localDate } from '@/domain/deadline';
import { CURRENT_RULES } from '@/domain/rules';

/**
 * O relatório de propostas para a assembleia: a fotografia congelada (secção 8, "Quem Pinta — a
 * oferta"). Gera-se aqui, a primeira vez que quem gere o pedido abre esta página depois de as
 * propostas estarem entregues — sempre antes de qualquer escolha, porque é exactamente esta página
 * que se consulta antes de escolher. Diferente de `../relatorio` (recalculado a cada visita, com
 * síntese e matriz completas): esta fica fixa desde a primeira geração.
 */
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await getUser();
  const { data } = await supabase.from('work_requests').select('ref').eq('id', id).maybeSingle();
  return { title: `Relatório fixo das propostas — ${data?.ref ?? ''}` };
}

export default async function RelatorioFixoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await getUser();

  const { data: req } = await supabase.from('work_requests').select('*').eq('id', id).maybeSingle();
  if (!req) notFound();
  const { data: org } = await supabase.from('organizations').select('id, nome, gerida_por').eq('id', req.org_id).single();
  if (!org) notFound();
  if (!canManage(await myRole(supabase, user!.id, org))) notFound();

  const entrega = estadoDaEntrega(req.prazo_propostas, localDate(new Date(), CURRENT_RULES.timeZone), req.status === 'publicado');
  const caminhoPropostas = `/app/pedidos/${id}/propostas`;

  if (!entrega.entregues) {
    return (
      <div className="space-y-5">
        <Voltar href={caminhoPropostas}>Propostas recebidas</Voltar>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 text-[17px] text-slate-600">
          <p className="font-semibold text-slate-900">Este relatório ainda não existe.</p>
          <p className="mt-1">
            Só se gera depois de as propostas serem entregues — é a mesma fotografia que, a partir daí, fica fixa
            para a assembleia. Até ao fim do prazo, volte aqui depois.
          </p>
        </div>
      </div>
    );
  }

  const relatorio = await obterOuGerarRelatorioCongelado(supabase, id);
  if (!relatorio) {
    return (
      <div className="space-y-5">
        <Voltar href={caminhoPropostas}>Propostas recebidas</Voltar>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 text-[17px] text-slate-600">
          <p className="font-semibold text-slate-900">Não há propostas submetidas para este pedido.</p>
          <p className="mt-1">Sem nenhuma proposta, não há nada para fotografar.</p>
        </div>
      </div>
    );
  }

  const { data: fichasRows } = await supabase
    .from('relatorios_de_propostas_fichas')
    .select('numero, codigo_pagina, dados')
    .eq('relatorio_id', relatorio.id)
    .order('numero');
  const fichas = (fichasRows ?? []).map((r) =>
    reconstroiFicha({ numero: r.numero, codigoPagina: r.codigo_pagina, dados: r.dados as unknown as DadosDaFichaGuardada }),
  );
  const linhas = fichas.map(linhaDeFicha);
  const link = enderecoPublico(BRAND.domain, relatorio.token);
  const qrSvg = qrCodeSvg(link, 'Código QR do relatório público de propostas');

  return (
    <div className="space-y-5">
      <div className="print:hidden">
        <Voltar href={caminhoPropostas}>Propostas recebidas</Voltar>
        <h1 className="mt-3 text-[26px] leading-tight font-semibold">Relatório fixo das propostas, para a assembleia</h1>
        <p className="mt-1 text-[17px] text-slate-600">
          Gerado a {new Date(relatorio.geradoEm).toLocaleDateString('pt-PT', { timeZone: 'Europe/Lisbon', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}, no
          momento em que as propostas foram entregues. A ordem é aleatória e ficou fixa nesse momento — imprima ou
          guarde em PDF pelo menu de impressão do navegador; quem receber uma página confirma pelo código QR que
          pertence a este mesmo relatório.
        </p>
        <p className="mt-2 text-[15px] text-slate-500">
          Ligação pública, sem conta: <span className="break-all font-mono">{link}</span>
        </p>
      </div>

      <RelatorioCongeladoView
        titulo={req.titulo}
        ref={req.ref}
        codigoObra={relatorio.codigoObra}
        numeroDePropostas={relatorio.numeroDePropostas}
        avisoDeIntegridade={avisoDeIntegridade(relatorio.numeroDePropostas)}
        geradoEm={relatorio.geradoEm}
        linhas={linhas}
        fichas={fichas}
        qrSvg={qrSvg}
        link={link}
      />
    </div>
  );
}
